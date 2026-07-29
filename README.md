# Prepilo

**Desktop interview prep for engineers.** Daily practice, a Monaco coding playground, mock rounds, and analytics — with an optional session lock that gates login, logout, and shutdown behind a real interview question.

[![Release](https://img.shields.io/github/v/release/souravs72/prepilo?label=release)](https://github.com/souravs72/prepilo/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux-informational)](https://github.com/souravs72/prepilo/releases)

---

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/4d694945-ca0b-4cba-bf57-6fcbd99e21ee" alt="Prepilo Today — daily interview set" width="900" />
</p>
<p align="center"><em>Today — structured daily set across coding, MCQ, and short answers</em></p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/cfd686ac-ddf8-424e-8772-0fb193ceac74" alt="Prepilo Practice — topic filters" width="900" />
</p>
<p align="center"><em>Practice — filter by difficulty, topic, company, and question type</em></p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/fb7c3627-1c59-4cd3-9134-25be53346c9c" alt="Prepilo Playground — Monaco editor" width="900" />
</p>
<p align="center"><em>Playground — multi-language Monaco editor with local sample and hidden tests</em></p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/70fe12f4-bb3e-43a0-b949-79c3efd18076" alt="Prepilo Analytics" width="900" />
</p>
<p align="center"><em>Analytics — streaks, accuracy, and topic coverage over time</em></p>

---

## Features

| Area | What you get |
|------|----------------|
| **Today** | A fresh daily set of original interview-style questions |
| **Practice** | Filters for DSA, system design, OS, DBMS, company tags, and more |
| **Playground** | Monaco IDE · Python, JavaScript, Java, C++, Go, Rust · local runner |
| **Mock** | Timed interview-style rounds |
| **Analytics** | Streaks, accuracy, and topic heat |
| **Coach** | Hints and explanations (local by default; optional OpenAI) |
| **Session lock** | Optional GTK lock that requires solving a question to unlock the desktop |

Questions are generated combinatorially — not scraped LeetCode dumps. Progress and drafts stay on your machine under `~/.config/prepilo`.

---

## Install (Linux)

### Recommended — one-liner

```bash
curl -fsSL https://raw.githubusercontent.com/souravs72/prepilo/main/scripts/install-linux.sh | bash -s -- --download
prepilo
```

Downloads the latest [GitHub Release](https://github.com/souravs72/prepilo/releases/latest) AppImage, extracts it (works **without FUSE**), installs icons and a desktop entry, and adds the `prepilo` command to `~/.local/bin`.

### From a downloaded AppImage

```bash
chmod +x Prepilo-*-linux-x86_64.AppImage
./scripts/install-linux.sh ./Prepilo-*-linux-x86_64.AppImage
prepilo
```

### From a `.deb`

```bash
sudo apt install ./prepilo_*_amd64.deb
```

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/souravs72/prepilo/main/scripts/uninstall-linux.sh | bash
# or, from a checkout:
./scripts/uninstall-linux.sh
```

---

## Session lock (optional, Ubuntu / GNOME)

Gates login, logout, and shutdown behind a Prepilo question.

```bash
npm run install-lock   # from a source checkout
prepilo-show-bypass    # save this key somewhere safe
prepilo-lock
```

**Dependencies:** `python3-gi`, GTK 3, `gir1.2-webkit2-4.1`

Bypass key: `~/.config/prepilo/bypass.key` (never commit).

If you get stuck: switch to a TTY (`Ctrl+Alt+F3`), then run `prepilo-show-bypass` or `desktop/uninstall-lock.sh`.

---

## Develop from source

**Requirements:** Node.js 22+, Linux recommended for the full Electron + lock stack.

```bash
git clone https://github.com/souravs72/prepilo.git
cd prepilo
npm install
npm run dev            # Vite UI + local runner on :4789
npm run electron:dev   # Electron shell against the Vite server
```

Useful scripts:

| Command | Purpose |
|---------|---------|
| `npm run build` | Production web bundle → `dist/` |
| `npm run dist` | Build AppImage + `.deb` → `release/` |
| `npm run install-app` | Install study-app launcher for this checkout |
| `npm run install-lock` | Install optional GTK session lock |
| `npm test` | Vitest suite |
| `npm run runner` | Local code-runner API only (`127.0.0.1:4789`) |

### Publish a release

```bash
npm ci
npm run dist           # smoke-test packages locally
git tag vX.Y.Z
git push origin vX.Y.Z # GitHub Actions builds AppImage + deb
```

---

## Architecture

```text
electron/     Electron study shell, icons, installers
desktop/      GTK + WebKit session lock and guard
src/          React UI (Today, Practice, Playground, Mock, Analytics, Coach)
server/       Local runner API (Express on 127.0.0.1:4789)
scripts/      Linux install / uninstall helpers
.github/      Release workflow (tag v* → AppImage + deb)
```

| Keep local | Ship in the repo |
|------------|------------------|
| `node_modules/`, `dist/`, `release/` | `src/`, `electron/`, `desktop/`, `server/`, `scripts/` |
| `~/.config/prepilo/*` | Icons, workflows, package manifests |
| API keys / `.env` | Tests and public docs |

Optional OpenAI coaching can read credentials from `~/.config/daily-work-digest/.env` and `config.yaml` when present.

---

## License

[MIT](LICENSE) © Prepilo contributors
