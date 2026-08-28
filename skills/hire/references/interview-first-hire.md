# The first hire — seven questions

Used when `discover.mjs` prints `mode first-hire` (no config, or a roster with zero seats).
The person answering has never hired an agent before and may never have opened a terminal
before today. Every question is **options with a recommendation named** — propose, then let
them correct. Never a blank prompt.

The four that matter come straight from the definition of an employee: **a job, instructions,
tools, a place to work.** Then three that keep it honest when nobody is watching.

Each question names the answers-file field it fills, and the fields it sets by default so the
answers file is complete without asking twelve things.

**"You pick" is always a valid answer.** If they say "I don't know", "you pick", "recommend",
"whatever you think", or pick Other and leave it blank: take the recommended option, say in
one line which one you took and why, and move to the next question. Never re-ask, never
explain the options again. Every answer can be edited later in `docs/team/<name>.md` and
the host-specific agent file: `.codex/agents/<name>.toml` for Codex or
`.claude/agents/<name>.md` for Claude Code. The close should say so once.

---

### 0. Your business, in one line → `org`  (asked once, before `init`)

"What do you sell, and to whom?" One sentence. This becomes `org` in the config and the
material for every drafted option below. Run `init.mjs --host codex --org "<their words>"`
in Codex, or use `--host claude` in Claude Code.

### 1. A job — one thing it owns → `owns`, `role`, `name`, `display`, `description`

Draft **three ownership statements** from what they sell, and let them pick or fix one:
"every enquiry that reaches the café gets an answer the same day", "every invoice is chased
until paid or written off", "every week has a content plan by Monday 9am".

**Ownership, not activity.** "Replies to messages" is a task. "Nothing is left on read" is a
job. Say that out loud in the question.

From the pick, propose `role` (two words, "Enquiry Desk"), `name` (lowercase slug — suggest a
human first name; it is what they will type) and a one-line `description`.
Defaults set here: `label` = role; `keywords` = 6–10 words pulled from the ownership
statement; `routedWhen` drafted from the same. Show them, do not ask.

### 2. Instructions — how would you do it? → `inputs`, `outputs`, `routedWhen`

"If you did this job yourself: what lands in front of you, and what do you hand back?"
Offer a drafted pair from Q1 and let them fix it. If the output is not a thing someone could
open (a file, a list, a reply), push once: "what would I see on your screen when it's done?"

### 3. Tools — what may it touch? → `tools.allow`, `tools.deny`, `model`

Three shapes, recommend the middle one:
- **Read only** — reads and searches files. Good for research, summaries, checking.
- **Files** *(recommended)* — reads, writes and edits files in this folder. `Read, Write,
  Edit, Glob, Grep`.
- **Files + web** — also searches the web. Adds `WebSearch, WebFetch`.
Running commands (`Bash`) is not offered on a first hire. Say so; it can be added later.
For Codex, also set `sandbox`: `read-only` for Read only and `workspace-write` for either
Files choice. Let the custom agent inherit the current Codex model. For Claude Code,
default `model: sonnet`; `deny` is everything not allowed that could act (`Bash` always).

### 4. A place to work → confirms `root`

"Your employee lives in this folder: `<cwd>`. Everything it knows and everything it makes
stays here. OK?" Yes / pick another folder (stop; they `cd` there and start over). No field —
this is the moment they understand that the folder *is* the employee's desk.

### 5. Never, even when asked → `nevers`

Draft **three refusals** from the job's blast radius — the things that would embarrass them
or cost money: "never confirms a booking over 8 people", "never promises a refund", "never
invents a price". Let them pick, add, or swap. A seat with no NEVERs has not been thought
about. Fill `boundaries` from the same answer if the template needs it.

### 6. Stuck, and you're asleep → `unattended`, `escalation`, `qa`

"It hits something it is not sure about at 11pm. What does it do?" Three options:
- **Stops and leaves a note** *(recommended)* — writes what it found and what it needs,
  marks it for you, touches nothing else.
- **Does the safe half** — finishes what it is sure of, leaves the rest marked.
- **Asks in chat** — only works while you are there; say that.
`escalation` = "anything about <the NEVERs' topics> is written up for the owner, not
answered". `qa` defaults to "the owner, by reading the output" unless they name a person.

### 7. First shift, and done means → `firstShift`, `metric`

Two halves:
- "What is the **first real task** you will hand it in the next five minutes?" Concrete.
  "Answer the ten messages sitting in inbox/." Not "help with customer service".
- "How will you know it is **doing the job**, a month from now?" One observable line.
Default `decommission` = "when the job stops existing or you fold it into another hire" —
stated, not asked.

---

## Not asked on a first hire (and why)

| team question | first-hire handling |
| --- | --- |
| department | none — a one-person roster has no departments; `requires` omits it |
| overlap check | roster is empty; `discover.mjs` already prints "no keyword overlap". Do not ask |
| model tier | `sonnet`, stated |
| reactive vs standing | reactive always; motors are a second-week conversation |
| quality bar wording | folded into Q7's "done means" |

## The answers file

`examples/first-hire/answers-maya.json` is a complete filled-in example — a café owner's
first hire. Required fields for the preset: `name role owns description keywords model
tools.allow inputs outputs nevers qa unattended firstShift metric`.

## The close

After `apply.mjs --confirm` reports HIRED, do not stop at the file list. Print the one line
they paste next, built from `firstShift`:

> **Your employee is hired. Give it its first shift — paste this:**
> `Use the <name> agent to <firstShift>`

Then tell them where to look when it finishes (`outputs`), and that `docs/team/<name>.md`
is the job description they can read any time. The exercise is not over until the agent has
run once.
