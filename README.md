# Prepilo

Premium desktop interview preparation platform.

- **Study app:** Electron desktop window  
- **Session lock:** GTK + WebKit (Ubuntu/GNOME), optional  

## Install (end users)

### One-liner (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/souravs72/prepilo/main/scripts/install-linux.sh | bash -s -- --download
prepilo
```

This downloads the latest GitHub Release AppImage, **extracts it** (works without FUSE), installs icons + a desktop launcher, and wires the `prepilo` command.

### Option A — AppImage file you already downloaded

```bash
chmod +x Prepilo-*-linux-x86_64.AppImage
./scripts/install-linux.sh ./Prepilo-*-linux-x86_64.AppImage
prepilo
```

### Option B — `.deb`

```bash
sudo apt install ./prepilo_*_amd64.deb
```

### Option C — from source (developers)

```bash
git clone https://github.com/souravs72/prepilo.git
cd prepilo
npm install
npm run build
npm run install-app    # study app launcher (dev)
npm run install-lock   # optional GTK login/logout lock
prepilo
```

Uninstall user install: `scripts/uninstall-linux.sh`

## Build distributables (maintainers)

```bash
npm ci
npm run dist           # → release/*.AppImage and release/*.deb
```

Tag a version to publish via GitHub Actions:

```bash
git tag v1.1.1
git push origin v1.1.1
```

## Features

- Daily set of original interview-style questions (DSA, system design, OS, DBMS)
- Practice, playground (Monaco), mock interviews, analytics, AI coach
- Optional desktop lock that gates login / logout / shutdown behind a question
- Local code runner API on `127.0.0.1:4789`

## Desktop lock (optional, Ubuntu)

```bash
npm run install-lock
prepilo-show-bypass   # write this down
prepilo-lock
```

Needs: `python3-gi`, GTK 3, `gir1.2-webkit2-4.1`. Bypass key lives in `~/.config/prepilo/bypass.key` (local only — never commit).

Stuck? `Ctrl+Alt+F3` → `prepilo-show-bypass` or `desktop/uninstall-lock.sh`.

OpenAI (optional) from `~/.config/daily-work-digest/.env` + `config.yaml`.

## Architecture

```text
electron/     Study UI shell (Electron)
desktop/      GTK lock + session guard
src/          React UI
server/       Local runner API
release/      Built AppImage/deb (gitignored)
```

## Local vs GitHub

| Keep local only | Commit to GitHub |
|-----------------|------------------|
| `node_modules/`, `dist/`, `release/` | Source under `src/`, `electron/`, `desktop/`, `server/` |
| `~/.config/prepilo/*` (bypass, analytics) | `README`, workflows, icons |
| API keys / `.env` | Tests, package manifests |

## Notes

- Questions are original / combinatorial — not scraped LeetCode dumps.
- Repo should be **public** (or Releases public) for others to download packages.
