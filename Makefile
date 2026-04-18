NAME = sp-dock
UUID = $(NAME)@gnikolaos.gr

.PHONY: build install uninstall clean

build: clean
	mkdir -p build
	gnome-extensions pack -f \
		--extra-source=metadata.json \
		--extra-source=extension.js \
		--extra-source=prefs.js \
		--extra-source=prefs.xml \
		--extra-source=panelButton.js \
		--extra-source=dbus.js \
		--extra-source=settingsFields.js \
		--extra-source=constants.js \
		--schema=schemas/org.gnome.shell.extensions.sp-dock.gschema.xml \
		--podir=locale \
		--gettext-domain=sp-dock \
		-o build/

install: uninstall build
	gnome-extensions install -f build/$(UUID).shell-extension.zip

uninstall:
	rm -rf $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

clean:
	rm -rf build/
