import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import { ExtensionPreferences, gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import settingsFields from "./settingsFields.js";

export default class SpDockPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage();
        window.add(page);

        const displayGroup = new Adw.PreferencesGroup({
            title: _("Main settings"),
        });
        page.add(displayGroup);

        const formatRow = new Adw.EntryRow({
            title: _("Display format for songs"),
        });
        settings.bind("display-format", formatRow, "text", Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(formatRow);

        const podcastFormatRow = new Adw.EntryRow({
            title: _("Display format for podcasts"),
        });
        settings.bind("podcast-format", podcastFormatRow, "text", Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(podcastFormatRow);

        const displayModeRow = new Adw.ComboRow({
            title: _("Display mode"),
            model: new Gtk.StringList(),
        });
        displayModeRow.model.append(_("Static"));
        displayModeRow.model.append(_("Marquee"));
        settings.bind("display-mode", displayModeRow, "selected", Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(displayModeRow);

        const positionRow = new Adw.ComboRow({
            title: _("Position in panel"),
            model: new Gtk.StringList(),
        });
        positionRow.model.append(_("Left"));
        positionRow.model.append(_("Center"));
        positionRow.model.append(_("Right"));
        settings.bind("position", positionRow, "selected", Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(positionRow);

        const logoPositionRow = new Adw.ComboRow({
            title: _("Show Spotify logo"),
            model: new Gtk.StringList(),
        });
        logoPositionRow.model.append(_("Don't show"));
        logoPositionRow.model.append(_("Left of label"));
        logoPositionRow.model.append(_("Right of label"));
        settings.bind("logo-position", logoPositionRow, "selected", Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(logoPositionRow);

        const staticGroup = new Adw.PreferencesGroup({
            title: _("Static display settings"),
        });
        page.add(staticGroup);

        const titleLengthRow = new Adw.SpinRow({
            title: _("Max. title field length"),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 1,
            }),
        });
        settings.bind("title-max-length", titleLengthRow, "value", Gio.SettingsBindFlags.DEFAULT);
        staticGroup.add(titleLengthRow);

        const artistLengthRow = new Adw.SpinRow({
            title: _("Max. artist field length"),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 1,
            }),
        });
        settings.bind("artist-max-length", artistLengthRow, "value", Gio.SettingsBindFlags.DEFAULT);
        staticGroup.add(artistLengthRow);

        const albumLengthRow = new Adw.SpinRow({
            title: _("Max. album field length"),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 1,
            }),
        });
        settings.bind("album-max-length", albumLengthRow, "value", Gio.SettingsBindFlags.DEFAULT);
        staticGroup.add(albumLengthRow);

        const marqueeGroup = new Adw.PreferencesGroup({
            title: _("Marquee display settings"),
        });
        page.add(marqueeGroup);

        const marqueeLengthRow = new Adw.SpinRow({
            title: _("Max. marquee length"),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 1,
            }),
        });
        settings.bind("marquee-length", marqueeLengthRow, "value", Gio.SettingsBindFlags.DEFAULT);
        marqueeGroup.add(marqueeLengthRow);

        const marqueeIntervalRow = new Adw.SpinRow({
            title: _("Marquee frame duration in milliseconds"),
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 20000,
                step_increment: 50,
            }),
        });
        settings.bind("marquee-interval", marqueeIntervalRow, "value", Gio.SettingsBindFlags.DEFAULT);
        marqueeGroup.add(marqueeIntervalRow);

        const marqueeTailRow = new Adw.EntryRow({
            title: _("Marquee separator"),
        });
        settings.bind("marquee-tail", marqueeTailRow, "text", Gio.SettingsBindFlags.DEFAULT);
        marqueeGroup.add(marqueeTailRow);

        const inactiveGroup = new Adw.PreferencesGroup({
            title: _("Inactive Spotify settings"),
        });
        page.add(inactiveGroup);

        const hideInactiveRow = new Adw.SwitchRow({
            title: _("Hide widget when Spotify is inactive"),
        });
        settings.bind("hidden-when-inactive", hideInactiveRow, "active", Gio.SettingsBindFlags.DEFAULT);
        inactiveGroup.add(hideInactiveRow);

        const notRunningRow = new Adw.EntryRow({
            title: _("Text to show when inactive"),
        });
        settings.bind("off", notRunningRow, "text", Gio.SettingsBindFlags.DEFAULT);
        inactiveGroup.add(notRunningRow);

        const pausedGroup = new Adw.PreferencesGroup({
            title: _("Pause playback settings"),
        });
        page.add(pausedGroup);

        const hidePausedRow = new Adw.SwitchRow({
            title: _("Hide widget when playback is paused"),
        });
        settings.bind("hidden-when-paused", hidePausedRow, "active", Gio.SettingsBindFlags.DEFAULT);
        pausedGroup.add(hidePausedRow);

        const pausedMetadataRow = new Adw.SwitchRow({
            title: _("Show metadata when paused"),
        });
        settings.bind("metadata-when-paused", pausedMetadataRow, "active", Gio.SettingsBindFlags.DEFAULT);
        pausedGroup.add(pausedMetadataRow);

        const pausedTextRow = new Adw.EntryRow({
            title: _("Text to show when paused"),
        });
        settings.bind("paused", pausedTextRow, "text", Gio.SettingsBindFlags.DEFAULT);
        pausedGroup.add(pausedTextRow);

        const stoppedGroup = new Adw.PreferencesGroup({
            title: _("Stopped playback settings"),
        });
        page.add(stoppedGroup);

        const hideStoppedRow = new Adw.SwitchRow({
            title: _("Hide widget when playback is stopped"),
        });
        settings.bind("hidden-when-stopped", hideStoppedRow, "active", Gio.SettingsBindFlags.DEFAULT);
        stoppedGroup.add(hideStoppedRow);

        const stoppedTextRow = new Adw.EntryRow({
            title: _("Text to show when stopped"),
        });
        settings.bind("stopped", stoppedTextRow, "text", Gio.SettingsBindFlags.DEFAULT);
        stoppedGroup.add(stoppedTextRow);

        const indicatorsGroup = new Adw.PreferencesGroup({
            title: _("Loop and shuffle indicators"),
        });
        page.add(indicatorsGroup);

        const shuffleRow = new Adw.EntryRow({
            title: _("Shuffle"),
        });
        settings.bind("shuffle", shuffleRow, "text", Gio.SettingsBindFlags.DEFAULT);
        indicatorsGroup.add(shuffleRow);

        const loopPlaylistRow = new Adw.EntryRow({
            title: _("Loop playlist"),
        });
        settings.bind("loop-playlist", loopPlaylistRow, "text", Gio.SettingsBindFlags.DEFAULT);
        indicatorsGroup.add(loopPlaylistRow);

        const loopTrackRow = new Adw.EntryRow({
            title: _("Loop track"),
        });
        settings.bind("loop-track", loopTrackRow, "text", Gio.SettingsBindFlags.DEFAULT);
        indicatorsGroup.add(loopTrackRow);

        const actionsGroup = new Adw.PreferencesGroup();
        page.add(actionsGroup);

        const resetButtonRow = new Adw.ActionRow({
            title: _("Restore defaults"),
        });
        resetButtonRow.set_activatable(true);
        resetButtonRow.connect("activated", () => {
            settingsFields.forEach((field) => {
                if (field.resettable) {
                    settings.reset(field.setting);
                }
            });
        });
        actionsGroup.add(resetButtonRow);
    }
}
