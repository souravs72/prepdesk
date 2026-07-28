# PrepDesk

Premium desktop-first interview preparation platform.

**Location:** `/home/ascra/Projects/prepdesk`

## Features

- **Daily set** — 12 original questions/day (MCQ, objective, coding) across DSA, system design, OS, DBMS
- **Dynamic generation** — combinatorial templates inspired by LeetCode / GFG / InterviewBit *style* (no scraped content)
- **Rich explanations** — why right, why wrong, complexities, pitfalls, alternatives, follow-ups
- **Coding playground** — Monaco editor, 6 languages, sample + hidden tests
- **Local runner** — executes code against tests (`python`, `node`; others if toolchains exist)
- **Practice filters** — topic, difficulty, domain
- **Mock interviews** — timed 5-question sessions
- **Analytics** — accuracy, streaks, weak/strong topics
- **AI coach** — local progressive hints + optional OpenAI key

## Quick start (browser study mode)

```bash
cd /home/ascra/Projects/prepdesk
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). API on `127.0.0.1:4789`.

## Desktop lock — native GTK (cannot dismiss until solved)

Pure **GTK3** fullscreen lock (no WebKit). Grabs keyboard + pointer when the session allows it, disables GNOME Alt+Tab / Super / logout shortcuts until you solve an MCQ/objective question **correctly**, or type the emergency bypass key (paste blocked).

```bash
npm run install-lock          # autostart + ~/.config/prepdesk/bypass.key
prepdesk-show-bypass          # WRITE THIS DOWN (TTY-safe)
prepdesk-lock                 # test the native lock now
```

Needs: `python3-gi`, GTK 3. Runner API auto-starts (`npm run runner`) for unlock/analytics. Study UI (`npm run dev`) is optional.

OpenAI explanations use `OPENAI_API_KEY` + model from:

- `~/.config/daily-work-digest/.env`
- `~/.config/daily-work-digest/config.yaml` (`openai.model`)

Stuck? `Ctrl+Alt+F3` → `prepdesk-show-bypass` or `desktop/uninstall-lock.sh`.

```bash
npm test
npm run build
```

## Architecture

```text
desktop/
  native_lock.py      # Native GTK lock UI + seat grab
  native_questions.py # Lock MCQ/objective bank + grading
  keybinds.py         # GNOME shortcut snapshot/restore
  lock_shell.py       # Legacy WebKit shell (unused by default)
src/                  # Browser study app (Vite/React)
server/runner.mjs     # Local API: run, lock arm/unlock, analytics
tests/                # Vitest
```

## Notes

- Questions are **original**. Do not expect verbatim LeetCode statements.
- Catalogue “size” is combinatorial (templates × params × topics), not a giant static JSON dump.
- Older DSA Gate sketch lived under Desktop learning apps / Projects/dsa_gate — PrepDesk replaces it as the product.
