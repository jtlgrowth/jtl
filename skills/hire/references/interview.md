# The twelve questions

Ask in three batches. Every question is **options with a recommendation named**, never a
blank prompt — the person hiring usually has not decided yet, and a blank prompt hands the
work back to them. Propose, then let them correct.

Each question names the answers-file field it fills.

---

## Batch A — Identity

### 1. Name and department → `name`, `display`, `department`, `role`

Ask for the seat's name and which department it belongs to. Offer the departments from
`discover.mjs` output as the options; if the config declares none, ask free-form.

- `name` — lowercase slug, `[a-z][a-z0-9-]*`. This is the id used everywhere.
- `display` — how it is written in prose. Defaults to the capitalised name.
- `role` — two or three words. "Partnerships", "Security Desk", "Support".

### 2. What does it own? → `owns`

**Not what it does — what it is accountable for.** The difference is the whole point:
employees own outcomes, task-runners do activities. "Writes partner emails" is an activity.
"Every partner relationship reaching a yes or a no within two weeks" is an ownership.

Offer three drafted ownership statements based on the role and let them pick or correct.

### 3. Overlap check → confirms the hire should happen at all

**Run the probe first. Do not ask this from memory.**

```bash
node "<skill-dir>/scripts/discover.mjs" --probe "<role and its keywords>"
```

Paste the real scores into the question:

> Closest existing seats: `otto` 22% (shared: docs, release, guide), `mila` 8%.
> Is this a new seat, or an expansion of `otto`?

Options: **new seat** / **expand the existing one instead** (stop the hire, amend that seat)
/ **new seat, and narrow the existing one** (hire, then note the boundary in both docs).

Most bloated rosters are a stack of hires that should have been amendments. This is the
question that prevents the merge you will otherwise run in six months.

### 4. Routing triggers → `keywords`, `label`, `routedWhen`

What words in a request should send work here? Propose 6–10 keywords from the role and let
them add. `label` is the human-readable route name; `routedWhen` is the prose sentence that
goes in the job doc.

---

## Batch B — Execution

### 5. Model tier → `model`, `effort`, `runtime`, `preferredModel`

Route by measured cost, not price tier:

- **default tier** (e.g. `sonnet`) — almost everything.
- **top tier** (e.g. `opus`) — judgment only: architecture, security, money, or gating
  another agent's output.
- **cheap tier** (e.g. `haiku`) — single-shot lookups *with a stated tool-call ceiling*.
  Without a ceiling a weak model pays for thin planning with extra tool calls, and every
  call's output re-enters context at full price on every later turn.

`runtime` is the prose version for the job doc.

### 6. Tool scope → `tools.allow`, `tools.deny`

What may this seat touch? Offer the shapes, not a checkbox list:

- **Read-only** — read, search, fetch. Nothing mutates. Correct for research, audit, QA.
- **Read + write** — plus file edits. The default for builders.
- **Full** — plus shell. Only when the job genuinely needs to run things.
- **Money / production** — call it out explicitly; it usually wants read-only plus an
  escalation path rather than write access.

This is the surface most likely to be forgotten and the most likely to fail closed. If the
config declares a `set-equality` guard on it, a missing entry does not break the new seat —
it breaks **every** seat.

### 7. Inputs → outputs → `inputs`, `outputs`

What arrives, what leaves, and where the artifact lands. If nobody can name the output, the
seat is a job title, not a job.

### 8. Reactive or standing → `cadence`, `cadenceDetail`, `motor`

- **reactive** — runs only on routed work. The default.
- **motor** — has standing work on a schedule. Sets `motor: true`, which generates a
  disabled motor script. Ask for the cadence in words (`cadenceDetail`).

---

## Batch C — Boundaries and blindspots

### 9. Hard NEVERs → `nevers`, `boundaries`

What must this seat refuse **even when asked directly**? Not preferences — refusals.
"Never moves money." "Never signs a contract." "Never commits an engineering date."

Propose three drawn from the role's obvious blast radius. A seat with no NEVERs either has
no power or has not been thought about.

### 10. Quality bar and reviewer → `qualityBar`, `qa`

What does good look like, in a form someone else can check? And **who reviews it** — a
named reviewer, self-review only, or the owner. "Self-review only" is a legitimate answer;
leaving it unanswered is not.

### 11. Escalation and unattended behavior → `escalation`, `unattended`

Two halves, both required:

- Blocked or uncertain — who does it go to, and at what threshold?
- **Nobody awake** — what does it do then? The honest answers are "records the state and
  stops" or "proceeds within this explicit boundary". An agent with no unattended rule
  invents one at 3am.

### 12. Success metric and decommission condition → `metric`, `decommission`

- What proves the seat earns its keep? A number or an observable trend.
- **What would make you fold it?** Nobody writes this down, which is why folding a seat
  later feels like a judgment call instead of a trigger being hit.

---

## The answers file

```jsonc
{
  "name": "tess",                    // slug, required
  "display": "Tess",                 // prose name
  "role": "Partnerships",            // 2–3 words
  "department": "growth",            // must be in config.departments
  "desk": "ACTIVE",                  // status line for the job doc
  "runtime": "sonnet / medium effort",

  "owns": "…",                       // Q2 — accountability, one sentence
  "description": "…",                // one-line summary for the definition file
  "label": "Partnerships",           // Q4
  "keywords": ["…"],                 // Q4
  "routedWhen": "…",                 // Q4, prose
  "tags": "partnerships, bizdev",
  "emoji": "🤝",

  "model": "sonnet",                 // Q5
  "effort": "medium",
  "preferredModel": "sonnet",
  "tools": { "allow": ["Read"], "deny": ["Write"] },   // Q6

  "inputs": "…",                     // Q7
  "outputs": "…",

  "cadence": "reactive",             // Q8
  "cadenceDetail": "…",
  "motor": false,

  "nevers": ["…"],                   // Q9
  "boundaries": "…",
  "qualityBar": "…",                 // Q10
  "qa": "Priya",

  "escalation": "…",                 // Q11
  "unattended": "…",

  "metric": "…",                     // Q12
  "decommission": "…"
}
```

Required fields are declared per-config in `requires[]`; the plan is refused with a named
list if any are missing or empty.
