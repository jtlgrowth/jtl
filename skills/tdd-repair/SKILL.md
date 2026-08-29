---
name: tdd-repair
description: Auto-repair a single failing test under a bounded dollar budget by spawning headless Claude Code against it. Use when you have one concrete failing test (already red) and want an attempt at a minimal source fix, capped in cost and attempts. Not for writing new tests, not for multi-file refactors, not when no test exists yet.
---

# tdd-repair

Drives `scripts/tdd-repair.mjs`, which spawns a headless `claude -p` process scoped to
Read/Edit/Bash, points it at one failing test, and uses the test itself as the pass/fail
oracle: no LLM grading its own fix.

## When to use

- You have a single failing test (unit or integration) and want a bounded, unattended
  attempt at the minimal source-side fix.
- You are NOT trying to write the test, only fix the code under it.
- You want a hard dollar/time cap on the attempt instead of an open-ended agent loop.

Don't reach for this to fix flaky tests, multi-test cascades, or when the test itself is
wrong, those need a human to look first.

## How to run

```bash
# Dry run (default, no --confirm) prints the plan and exits without spawning anything
node scripts/tdd-repair.mjs \
  --repo /path/to/repo \
  --test path/to/failing.test.ts \
  --test-command "npx vitest run path/to/failing.test.ts"

# Actually run the repair
node scripts/tdd-repair.mjs \
  --repo /path/to/repo \
  --test path/to/failing.test.ts \
  --test-command "npx vitest run path/to/failing.test.ts" \
  --confirm
```

### Flags (from the script's own arg parser, read `scripts/tdd-repair.mjs` to confirm before relying on this list)

| Flag | Default | Meaning |
|---|---|---|
| `--repo <path>` | `.` | Repo root the test lives in |
| `--test <path>` | required | Path to the failing test file (read-only, never edited) |
| `--test-command <cmd>` | required | Shell command that runs just that test |
| `--max-attempts <n>` | `1` | Repair/verify rounds before giving up |
| `--budget <usd>` | `5.0` | Total dollar cap, split evenly across attempts |
| `--model <name>` | `haiku` | Model tier for the spawned `claude -p` |
| `--confirm` | off | Required to actually spawn the repair; omit for a dry-run plan |
| `--no-test-oracle` | off | Reserved: not implemented, refuses with an explanation |
| `--format <fmt>` | `json` | Output format flag (parsed but the script currently always emits JSON) |
| `--timeout-ms <n>` | `900000` (15 min) | Hard wall-clock cap, split across attempts |

## What the receipt JSON means

Every run, dry or real, prints one JSON object to stdout and sets the process exit code.

- `success`: `true` only if the test went from red to green.
- `data.mode`: always `"test-driven"` (the only implemented mode).
- `data.before` / `data.after`: pass/fail + exit code of the test before and after the run.
- `data.attempts[]`: one entry per round: the spawned `claude -p` outcome (`ok`, `exitCode`,
  `durationMs`, `usage`) and the re-run verification result.
- `data.totalCostUsd` / `data.budgetUsd` / `data.budgetExhausted`: actual spend vs cap.
- `data.reason`: set on failure paths: `test-already-passes`, `test-path-required`,
  `test-command-required`, `repo-not-found`, `claude-cli-not-installed`,
  `max-attempts-exhausted`, `conformant-mode-not-implemented`, `unexpected-failure`.

Exit codes: `0` repaired, `1` still red after max attempts, `2` config error, `3` reserved
for a non-zero `claude -p` exit not otherwise classified, `99` reserved for a safety
tripwire.

## Hard rules

- **Never edits the test file.** The spawned prompt explicitly forbids touching
  `--test` or any other test file; only the source under test is fair game.
- **Refuses if the test already passes.** A pre-flight run must fail (non-zero exit)
  before any repair attempt starts: a green test on entry means either the fix isn't
  needed or `--test-command` is wrong, and the script says which.
- **Budget cap per attempt is real, not advisory.** `--budget` is divided by
  `--max-attempts` and passed to `claude -p` as `--max-budget-usd` on every spawn; the
  spawned agent is also confined to `Read,Edit,Bash`: no MCP, no network egress via tools.
- **`--confirm` is required to run anything.** Without it, the script only prints the
  plan it would execute and exits 0: this is deliberate defense in depth beyond
  `claude -p`'s own permission gates.

Adapted from ruflo (github.com/ruvnet/ruflo), MIT.
