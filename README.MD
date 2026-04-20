# sp-dock

sp-dock is a very simple GNOME Shell extension that displays current track information in the system tray using Spotify's dbus interface without involving the web API. This is intended to be nothing more than a simple label for Spotify only.

Example static text, on the right side without logo:
![static](./example_static.png)

Example marquee text, in the center of the status bar, with logo:
![marquee](./example_marquee.gif)

## Features

- Shows the title, artist, album information, as well as playback modes. Allows you to customize how it's all shown. Can set separate display formats for podcasts and songs.

- Can show metadata either as a static label, or as a configurable, horizontally scrolling marquee

- Can choose which part of the top panel it will live in

- Uses Spotify's exposed dbus interface to fetch metadata, doesn't use the web API or require a premium account

- Works on Wayland as well as X

- Supports [ncspot](https://github.com/hrkfdn/ncspot)

## Installation

### Preferably, you should:

[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" alt="Get it on GNOME Extensions" height="100" align="middle">][extlink]

### Alternatively, you could:

1. Clone this repo anywhere on your computer

2. Run the command `make install`. This will "build" the extension (compile settings and localizations), create a new directory under `~/.local/share/gnome-shell/extensions/`, and copy the files into it.

3. Restart gnome-shell.

## Dependencies

- `libgtop` and gnome-tweaks as usual to load/install GNOME shell extensions.

## Reporting issues & bugs

Along with a quick description of the issue/bug, please also include:

- Your gnome-shell version

- Your spotify version

- Which package manager you got it from (Snap, Flatpak, AUR, whatever)


## License

GPLv3

## Notes

[extlink]: https://extensions.gnome.org/extension/9763/sp-dock/
This is a fork of the original [sp-tray](https://github.com/esenliyim/sp-tray)
