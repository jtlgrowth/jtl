---
name: setup
description: "Give Codex or Claude Code a name, voice, approval boundaries, and durable business memory with one idempotent block in the host's global instruction file. Use immediately after installing Codex or Claude Code, before the first hire, or when the user says $setup, /setup, set up Codex, name my COO, give it a name, or first-time setup."
---

# setup

Codex and Claude Code start without a chosen name, voice, or durable business context.
Use the host's global instruction file: `~/.codex/AGENTS.md` for Codex or
`~/.claude/CLAUDE.md` for Claude Code.

This skill asks three questions and writes one fenced block into that file. Re-running it
replaces the block and keeps whatever the user has saved under "About my business". Text
outside the markers is never touched.

## Run order

### 1. Check what is there

Determine the current host, then pass it explicitly on every command:

```bash
node "<skill-dir>/scripts/setup.mjs" --host codex --show
```

Use `--host claude` only when running inside Claude Code.

Exit 0 and a block printed: they have run this before, say so, show the name, and ask
whether to keep it or change it. Exit 1: fresh install, go straight to the questions.

### 2. Three questions: options with a recommendation, never blank prompts

Use the host's structured-question tool. One batch, all three at once.

**Q1 · Name.** "What do you want to call it?" Offer **Ana** (recommended), **Max**,
**Vee**, and let them type their own. One word, letters only. Say why the name matters:
every reply will start with `<Name>:`, so a reply without it means the rules did not load.

**Q2 · Voice.** "How should it talk to you?" Offer:
- **English, short and direct** (recommended) → `--lang english --tone direct`
- **Taglish, short and direct** → `--lang taglish --tone direct`
- **English, warm** → `--lang english --tone warm`
- **English, formal** → `--lang english --tone formal`
(Tagalog exists as `--lang tagalog` if they ask.)

**Q3 · Ask-first list.** "What must it ask you before doing?" Offer:
- **Deleting, sending to people, spending money** (recommended) → `--ask delete,send,pay`
- **Only sending and spending** → `--ask send,pay`
- **Everything above plus installing software** → `--ask delete,send,pay,install`

"You pick" / "I don't know" on any of the three = take the recommended option, name it in
one line, move on.

The memory rule ("when I tell you a fact about my business, save it in this file") is
always on. It is the reason the file exists. Do not ask about it; mention it once in the report.

### 3. Write

```bash
node "<skill-dir>/scripts/setup.mjs" --host codex --name Ana --lang english --tone direct --ask delete,send,pay
```

Prints CREATED / APPENDED / REPLACED and the block that landed. `--dry-run` previews
without writing if the user wants to see it first; on a first run, just write: it is three
lines they asked for, and they can read the file.

### 4. Report, and prove it

Say where the file is. Then tell them the proof: **start a fresh host session and send any
message; the reply starts with `<Name>:`.** Codex reads its global `AGENTS.md` once per
launched session, so an already-open session must be restarted. Close with one line:
"Tell it a fact about your business and it will save it for next time."

## What it will not do

- **Overwrite anything outside the markers.** A hand-written global instruction file keeps
  every line it had; the block is appended below.
- **Write a second block.** Re-runs replace the first one in place.
- **Write secrets, keys, or paths.** Name, voice, ask-first list, memory rule. That is all.
- **Touch project files.** Project instructions are separate (`./AGENTS.md` for Codex or
  `./CLAUDE.md` for Claude Code).

## Files

- `scripts/setup.mjs`: `--show`, write, `--remove`, `--dry-run`
- `test/tests.mjs`: `node skills/setup/test/tests.mjs`
