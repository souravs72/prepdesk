# Prepilo

Desktop interview prep for Linux — daily sets, practice, Monaco playground, mocks, analytics. Optional GTK session lock.

[![Release](https://img.shields.io/github/v/release/souravs72/prepilo?label=release)](https://github.com/souravs72/prepilo/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<p align="center">
  <img src="https://github.com/user-attachments/assets/4d694945-ca0b-4cba-bf57-6fcbd99e21ee" alt="Today" width="720" />
  <img src="https://github.com/user-attachments/assets/cfd686ac-ddf8-424e-8772-0fb193ceac74" alt="Practice" width="720" />
  <img src="https://github.com/user-attachments/assets/fb7c3627-1c59-4cd3-9134-25be53346c9c" alt="Playground" width="720" />
  <img src="https://github.com/user-attachments/assets/70fe12f4-bb3e-43a0-b949-79c3efd18076" alt="Analytics" width="720" />
</p>

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/souravs72/prepilo/main/scripts/install-linux.sh | bash -s -- --download
prepilo
```

AppImage (no FUSE needed), `.deb`, or local file:

```bash
./scripts/install-linux.sh ./Prepilo-*-linux-x86_64.AppImage
# or
sudo apt install ./prepilo_*_amd64.deb
```

Uninstall: `./scripts/uninstall-linux.sh`

## Develop

```bash
npm install
npm run dev            # UI + runner :4789
npm run electron:dev   # desktop shell
npm run dist           # AppImage + deb → release/
```

Node 22+. Tag `v*` to publish via GitHub Actions.

## Session lock (optional)

Ubuntu/GNOME. Needs `python3-gi`, GTK 3, `gir1.2-webkit2-4.1`.

```bash
npm run install-lock
prepilo-show-bypass    # keep this key
prepilo-lock
```

Stuck: `Ctrl+Alt+F3` → `prepilo-show-bypass` or `desktop/uninstall-lock.sh`

## Layout

```text
electron/   study app
desktop/    session lock
src/        React UI
server/     local runner (127.0.0.1:4789)
scripts/    install helpers
```

Config lives in `~/.config/prepilo` (not committed).

## License

[MIT](LICENSE)
