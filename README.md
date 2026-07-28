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

## Desktop lock (cannot dismiss until solved)

Fullscreen GTK/WebKit shell that stays on top until you solve the frozen question **correctly**, or type the emergency bypass UUID (paste disabled).

```bash
npm run install-lock          # autostart + ~/.config/prepdesk/bypass.key
prepdesk-show-bypass          # WRITE THIS DOWN (TTY-safe)
prepdesk-lock                 # test the lock now
```

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
src/
  components/     # Shell, QuestionPanel, UI primitives
  features/       # Today, Practice, Playground, Mock, Analytics, Coach
  lib/generator/  # Seeded daily + practice generators
  lib/progress/   # Zustand persistence + grading
  lib/ai/         # Local coach + optional OpenAI
server/runner.mjs # Sandboxed-ish local execution
tests/            # Vitest
```

## Notes

- Questions are **original**. Do not expect verbatim LeetCode statements.
- Catalogue “size” is combinatorial (templates × params × topics), not a giant static JSON dump.
- Older DSA Gate sketch lived under Desktop learning apps / Projects/dsa_gate — PrepDesk replaces it as the product.
