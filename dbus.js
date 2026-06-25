import GLib from "gi://GLib";
import Gio from "gi://Gio";

Gio._promisify(Gio.DBusConnection.prototype, "call");

//dbus constants
const path = "/org/mpris/MediaPlayer2";
const interfaceName = "org.mpris.MediaPlayer2.Player";
const spotifyDbus = `<node>
<interface name="org.mpris.MediaPlayer2.Player">
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="Shuffle" type="b" access="read"/>
    <property name="LoopStatus" type="s" access="read"/>
    <method name="Next"/>
    <method name="Previous"/>
    <method name="PlayPause"/>
</interface>
</node>`;

// Avoid shell main loop stall.
const QUERY_METADATA_TIMEOUT_MS = 3000;
// Hard ceiling for untrusted metadata strings. Well above any legitimate.
const MAX_METADATA_FIELD_LENGTH = 1000;

/**
 * At init, the extension starts watching the session bus for each supported client.
 */
const supportedClients = [
    {
        name: "Spotify",
        dest: "org.mpris.MediaPlayer2.spotify",
        watchId: null,
        isOnline: false, // to keep track of who appears and disappears in case multiple different clients are running
        versions: [
            {
                name: "spotify version >1.84",
                pattern: "/com/spotify",
                idExtractor: (trackid) => trackid.split("/")[3],
            },
            {
                name: "spotify version <1.84",
                pattern: "spotify:",
                idExtractor: (trackid) => trackid.split(":")[1],
            },
        ],
    },
    {
        name: "ncspot",
        dest: "org.mpris.MediaPlayer2.ncspot",
        watchId: null,
        isOnline: false,
        versions: [
            {
                name: "ncspot",
                pattern: "/org/ncspot",
                idExtractor: (trackid) => trackid.split("/")[4],
            },
        ],
    },
];

const SpDockDbus = class SpDockDbus {
    constructor(panelButton) {
        this.proxy = null;
        this.panelButton = panelButton;
        this.activeClient = null;
        this.metadataRetryTimeoutId = null;
        this.metadataRetryResolve = null;
        this.startWatching();
    }

    destroy() {
        if (this.proxy) {
            this.proxy.disconnectObject(this);
        }

        for (const client of supportedClients) {
            if (client.watchId) {
                Gio.bus_unwatch_name(client.watchId);
                client.watchId = null;
            }

            client.isOnline = false;
        }

        this.clearMetadataRetryTimeout();

        this.proxy = null;
        this.activeClient = null;
        this.panelButton = null;
    }

    timeout() {
        this.clearMetadataRetryTimeout();

        return new Promise((resolve) => {
            this.metadataRetryResolve = resolve;
            this.metadataRetryTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this.metadataRetryTimeoutId = null;
                this.metadataRetryResolve = null;
                resolve(true);
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    clearMetadataRetryTimeout() {
        if (this.metadataRetryTimeoutId) {
            GLib.Source.remove(this.metadataRetryTimeoutId);
            this.metadataRetryTimeoutId = null;
        }

        if (this.metadataRetryResolve) {
            this.metadataRetryResolve(false);
            this.metadataRetryResolve = null;
        }
    }

    startWatching() {
        // Start the watch for the supported clients.
        supportedClients.forEach((client) => {
            client.watchId = Gio.bus_watch_name(
                Gio.BusType.SESSION,
                client.dest,
                Gio.BusNameWatcherFlags.NONE,
                this.onClientAppeared.bind(this, client),
                this.onClientVanished.bind(this, client),
            );
        });
    }

    /**
     * When a supported Spotify client's name appears on the session bus, create a proxy for it.
     * This overrides the current proxy if there is one. Meaning the proxy is always for the most recently
     * appeared client.
     */
    async onClientAppeared(client) {
        console.debug(`Client ${client.name} appeared on DBus.`);

        try {
            this.makeProxyForClient(client);
        } catch (error) {
            console.error(error);
            return;
        }

        const proxy = this.proxy;
        const activeClient = this.activeClient;

        // This is necessary because the proxy's property cache might be initialized with incomplete values,
        // which needs to be updated after a short delay
        if (this.shouldRetry(proxy.Metadata)) {
            console.debug(`Bad metadata, querying again.`);
            try {
                await this.correctMetadata(proxy, activeClient);
            } catch (error) {
                console.error(error);
                if (this.proxy === proxy && this.activeClient === activeClient && this.panelButton) {
                    this.panelButton.updateLabel(true);
                }
            }
        } else {
            this.panelButton.updateLabel(true);
        }
    }

    shouldRetry(metadata) {
        // Don't check artist field, because it will be null/undefined for podcasts
        return (
            !metadata ||
            !metadata["mpris:trackid"] ||
            metadata["mpris:trackid"].unpack() === "" ||
            !metadata["xesam:album"] ||
            metadata["xesam:album"].unpack() === "" ||
            !metadata["xesam:title"] ||
            metadata["xesam:title"].unpack() === ""
        );
    }

    /**
     * Attempt to correct the proxy's incomplete Metadata cache
     * Makes 5 attempts at 100ms intervals. Sets the panelButton text if succeeds.
     */
    async correctMetadata(proxy, client) {
        const maxAttempts = 5;
        let attempt = 1;
        do {
            if (this.proxy !== proxy || this.activeClient !== client) {
                return;
            }

            const resp = await this.queryMetadata(client);
            const unpacked = resp.deepUnpack();
            if (!this.shouldRetry(unpacked)) {
                console.debug(`Got good metadata on attempt ${attempt}`);

                if (this.proxy !== proxy || this.activeClient !== client || !this.panelButton) {
                    return;
                }

                try {
                    proxy.set_cached_property("Metadata", resp);
                } catch (error) {
                    console.error(error);
                    return;
                }
                this.panelButton.updateLabel(true);
                return;
            } else {
                try {
                    const completed = await this.timeout();
                    if (!completed) {
                        return;
                    }
                } catch (e) {
                    console.error(e);
                }
                attempt++;
            }
        } while (attempt <= maxAttempts);

        if (this.proxy === proxy && this.activeClient === client && this.panelButton) {
            this.panelButton.showStopped();
        }
    }

    /**
     * Explicitly query the metadata property via DBus, instead of using the proxy cache.
     */
    async queryMetadata(client) {
        // For some reason the "Get" DBus method returns weird stuff. Had to go with GetAll and
        // pull Metadata out of it instead
        const reply = await Gio.DBus.session.call(
            client.dest,
            path,
            "org.freedesktop.DBus.Properties",
            "GetAll",
            new GLib.Variant("(s)", [interfaceName]),
            new GLib.VariantType("(a{sv})"),
            Gio.DBusCallFlags.NONE,
            QUERY_METADATA_TIMEOUT_MS,
            null,
        );
        return reply.deepUnpack()[0]["Metadata"];
    }

    /**
     * Create a proxy for a supported client, and connect the listen signal.
     * Overrides the existing proxy, if there is one. Sets the currently active client to the most recently
     * appeared.
     */
    makeProxyForClient(client) {
        if (this.activeClient && this.activeClient.name === client.name) {
            return;
        }

        if (this.proxy) {
            this.proxy.disconnectObject(this);
        }

        this.proxy = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.GET_INVALIDATED_PROPERTIES,
            Gio.DBusInterfaceInfo.new_for_xml(spotifyDbus),
            client.dest,
            path,
            interfaceName,
            null,
        );

        this.proxy.connectObject(
            "g-properties-changed",
            (_proxy, changed, _invalidated) => {
                const props = changed.deepUnpack();
                // TODO simplify this mess
                if (
                    !(
                        "PlaybackStatus" in props ||
                        "Metadata" in props ||
                        "LoopStatus" in props ||
                        "Shuffle" in props
                    )
                ) {
                    // None of the extension-relevant properties changed, nothing to do
                    return;
                }
                this.panelButton.updateLabel("Metadata" in props);
                return;
            },
            this,
        );

        client.isOnline = true;
        this.activeClient = client;
    }

    /**
     * Runs when a client's name vanished from the session bus. Marks the vanished client as inactive.
     * If the vanished client was the currently active one, looks for a replacement.
     */
    onClientVanished(client) {
        client.isOnline = false;
        // Nothing to do if the client that vanished wasn't the one we were watching
        if (this.proxy && client.dest !== this.proxy.get_name()) {
            console.debug(`Client ${client.name} vanished from DBus.`);
            return;
        }
        if (this.proxy) {
            this.proxy.disconnectObject(this);
        }
        this.activeClient = null;
        console.debug(`Client ${client.name} vanished from DBus, looking for another client.`);
        const otherClient = this.checkForOnlineClients();
        if (!otherClient) {
            console.debug("No other Spotify clients online.");
            this.proxy = null;
        } else {
            console.debug(`Client ${otherClient.name} is still online. Making it the primary.`);
            this.makeProxyForClient(otherClient);
        }

        if (this.panelButton) {
            this.panelButton.updateLabel(true);
        }
    }

    // Checks if any other supported client is online
    checkForOnlineClients() {
        for (const client of supportedClients) {
            if (client.isOnline) {
                return client;
            }
        }
        return null;
    }

    /**
     * Creates a metadata object that contains relevant information
     * @returns title, artist, album and trackType. Artist is blank when it's a podcast.
     */
    extractMetadataInformation() {
        if (!this.proxy || !this.proxy.Metadata || !this.proxy.Metadata["mpris:trackid"]) {
            return null;
        }
        const metadata = this.proxy.Metadata;
        const cap = (value) => value.slice(0, MAX_METADATA_FIELD_LENGTH);
        return {
            trackType: this.getTrackType(metadata["mpris:trackid"].unpack()),
            title: metadata["xesam:title"] ? cap(metadata["xesam:title"].unpack()) : "",
            album: metadata["xesam:album"] ? cap(metadata["xesam:album"].unpack()) : "",
            // Guarded against undefined xesam:artist for podcasts
            artist: metadata["xesam:artist"] ? cap(metadata["xesam:artist"].get_strv()[0] || "") : "",
            url: metadata["xesam:url"] ? metadata["xesam:url"].unpack() : "",
        };
    }

    getTrackType(trackId) {
        for (const version of this.activeClient.versions) {
            if (!trackId.startsWith(version.pattern)) {
                continue;
            }
            return version.idExtractor(trackId);
        }
        return null;
    }

    spotifyIsActive() {
        return this.proxy !== null;
    }

    getPlaybackStatus() {
        return this.proxy.PlaybackStatus;
    }

    getPlaybackControl() {
        if (!this.proxy || !this.proxy.Shuffle || !this.proxy.LoopStatus) {
            return null;
        }
        return {
            shuffle: this.proxy.Shuffle,
            loop: this.proxy.LoopStatus,
        };
    }

    next() {
        if (!this.proxy) return;
        try {
            this.proxy.NextRemote((_result, error) => {
                if (error) console.error(error);
            });
        } catch (e) {
            console.error(e);
        }
    }

    previous() {
        if (!this.proxy) return;
        try {
            this.proxy.PreviousRemote((_result, error) => {
                if (error) console.error(error);
            });
        } catch (e) {
            console.error(e);
        }
    }

    playPause() {
        if (!this.proxy) return;
        try {
            this.proxy.PlayPauseRemote((_result, error) => {
                if (error) console.error(error);
            });
        } catch (e) {
            console.error(e);
        }
    }
};

export default SpDockDbus;
