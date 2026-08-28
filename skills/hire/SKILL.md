---
name: hire
description: "Hire a Codex or Claude Code AI employee: guide a first hire through seven questions or add a seat to an existing roster through twelve questions, preview every affected surface, and write all files atomically or none. Use for $hire, /hire, hire an agent, hire my first employee, build an AI employee, add an employee, or onboard a new seat."
---

# hire

Adding an agent to a team is never one file. It is a job description, a roster entry, a
routing rule, a permission scope, a definition file, and a line in whatever document
humans actually read. Six surfaces, hand-maintained, none derived from the others.

Nobody hits six. They hit two, the seat half-exists, and the inconsistency is discovered
weeks later by a dispatcher at 3am — or never.

This skill asks twelve questions, shows exactly what it will write, and then writes all of
it or none of it.

## The rule that matters

**A half-hired seat is worse than no seat.** Every write is staged in memory. Guards run
against the staged content. If any required surface fails, any guard fails, or the
generated job doc misses a section the org's own standard requires, the whole hire is
refused and the disk is untouched.

## Run order

### 0. Find the config — and pick the mode

```bash
node "<skill-dir>/scripts/discover.mjs" --config <path-if-not-auto>
```

Looks for `hire.config.json` in the working directory, then `~/.hire.config.json` (if present; neither exists until a first hire runs `init.mjs`). It
prints the org, the departments, the current roster, the surfaces that will be written,
the guards that must pass — and a `mode` line that decides the rest of the run:

- **`NO CONFIG` / `mode first-hire`** — nobody has hired anything here yet. This is a
  founder's first employee. Ask one thing: *"Your business, in one line — what do you sell,
  to whom?"* Then:

  ```bash
  node "<skill-dir>/scripts/init.mjs" --host codex --org "<their words>"
  ```

  Use `--host claude` when running in Claude Code. The command writes
  `hire.config.json` (the first-hire preset) and an empty `roster.json` into
  the current folder — the folder *is* the employee's desk. Run `discover.mjs` again; it now
  reads `mode first-hire` with an empty roster. Continue with **the seven questions** in
  `references/interview-first-hire.md`. Do not read the twelve-question file. "You pick" /
  "I don't know" on any question = take the recommended option, name it, move on.
- **`mode team`** — a config exists and the roster has seats. Continue with the twelve
  questions below, exactly as before.

If a config exists but is malformed, stop and say so. Never guess at surfaces; a wrong path
writes a real file into a real repo. `references/config-schema.md` and
`examples/northwind/hire.config.json` are the reference for hand-built configs.

### 1. Interview — three batches, twelve questions (team mode)

**First-hire mode asks seven instead** — `references/interview-first-hire.md`, in the
words of the Day-1 definition: a job, instructions, tools, a place to work, then never /
unattended / first shift. Overlap check, department and model tier are stated defaults
there, not questions. The rest of this section is team mode.

Ask them with the host's structured-question tool, in options-with-a-recommendation form,
never as blank prompts. The exact wording and the option sets are in
`references/interview.md`. Read that file before asking anything.

- **A — Identity** (4): name and department, what the seat *owns*, the overlap check,
  routing triggers.
- **B — Execution** (4): model tier, tool scope, inputs → outputs, reactive or standing.
- **C — Boundaries** (4): hard NEVERs, quality bar and reviewer, escalation and unattended
  behavior, success metric and decommission condition.

Batch A is what everyone thinks to ask. B and C are the reason this skill exists — see
`references/blindspots.md` for the specific failure each one prevents.

**Question 3 is not optional and cannot be asked from memory.** Run the overlap check
first and paste the real numbers into the question:

```bash
node "<skill-dir>/scripts/discover.mjs" --probe "<the role in keywords>"
```

If an existing seat scores meaningfully, ask outright: *new seat, or expansion of that
one?* Most bloated rosters are a stack of hires that should have been amendments.

### 2. Write the answers file

Collect the answers into JSON. `examples/northwind/answers-tess.json` is a complete,
filled-in example; `references/interview.md` lists every field and its type. Save it
somewhere temporary — it is an input, not an artifact.

### 3. Preview

```bash
node "<skill-dir>/scripts/plan.mjs" --answers <answers.json>
```

Prints every file that will change, a unified diff of each, and the guard results.
**Nothing is written.** Show this to the operator and get an explicit yes.

### 4. Apply

```bash
node "<skill-dir>/scripts/apply.mjs" --answers <answers.json> --confirm
```

Writes everything or nothing, then runs the config's `verify` commands and reports each.

### 5. Report — and, on a first hire, the first shift

State: who was hired, which files landed, which optional surfaces were skipped and why,
and the verify results. If a verify command failed, say so plainly — the files are on disk
and someone has to look.

**First-hire mode does not end at the file list.** The hire is not proven until the
employee has worked once. Print the exact line they paste next, built from `firstShift`:

> Your employee is hired. Give it its first shift — paste this:
> `Use the <name> agent to <firstShift>`

Then say where the output will land (`outputs`) and that `docs/team/<name>.md` is the job
description they can read any time. Codex writes `.codex/agents/<name>.toml`; Claude Code
writes `.claude/agents/<name>.md`. Start a fresh host session in the same folder if the new
agent does not appear immediately.

## What it will not do

- **Overwrite an existing file.** A job doc that already exists means the seat exists.
- **Hire someone already on the roster.** `/hire` adds seats; it does not edit them.
- **Enable a motor.** Standing-work scripts are generated with `ENABLED = False`. A motor
  that starts running the moment it is generated is a motor nobody has read.
- **Invent a surface.** If it is not in the config, it is not written.
- **Hire the same name twice.** The roster check refuses it — a second employee gets a
  second name, and the first one's job doc stays the truth for the first.
- **Offer a motor, Bash, or a department on a first hire.** Those are second-week
  conversations; the first-hire preset does not ask.

## Three operations, any roster

Every surface reduces to one of:

| op | what it does |
| --- | --- |
| `file-from-template` | render a template to a new file, refusing to overwrite |
| `json-set` | set a JSON Pointer; a pointer ending in `/-` appends to an array |
| `line-insert` | insert a rendered line at a regex anchor, preserving hand formatting |

Prefer `line-insert` for files a human reads and formats by hand, `json-set` for machine
files. Any staged `.json` that would not parse aborts the hire.

Guards are declared, not coded: `set-equality` between two JSON Pointers catches the
classic roster failure where a list and its lookup table drift apart.

## Files

- `references/interview.md` — the twelve questions, verbatim, with option sets
- `references/blindspots.md` — why batches B and C exist, one real failure each
- `references/job-doc-standard.md` — what a good job description contains
- `references/config-schema.md` — every config field
- `examples/northwind/` — a complete fictional hire, runnable end to end
