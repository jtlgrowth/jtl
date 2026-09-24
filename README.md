# JTL Toolkit

**A curated set of agents and skills for [Claude Code](https://claude.com/claude-code),
from [JTL Growth](https://github.com/jtlgrowth).**

Three small kits, folded into one plugin so there is one thing to install and one name to
remember. Everything here is MIT licensed, has zero dependencies, and runs nothing in the
background.

No performance claims, no inflated counts, no invented capabilities.

---

## Install in one line

You need Claude Code installed first. If you don't have it yet, get it from
[claude.com/claude-code](https://claude.com/claude-code). It walks you through a normal
app install, no terminal required to start. Once it's installed, open it (on Mac, open
Terminal and type `claude`; on Windows, open PowerShell and type `claude`).

Inside Claude Code, type these two lines, one at a time, and press Enter after each:

```
/plugin marketplace add jtlgrowth/jtl
/plugin install jtl@jtl
```

That's it. Claude Code downloads the kit and it's ready to use. Nothing else installs
alongside it, nothing runs in the background, no accounts to make.

Works the same way on Mac and on Windows. The two lines above are typed inside Claude Code
itself, not in your regular terminal, so there's nothing OS-specific about them.

### If you're comfortable in a terminal

There's also a small convenience script, `install.sh`, in this repo. It checks that Claude
Code is on your machine and then runs the same two commands for you:

```bash
./install.sh
```

It does not install Claude Code itself, does not fetch anything beyond this repo, and does
not run anything in the background. It just automates the two lines above.

---

## What's in it

Six skills. Every one is addressed with the `jtl:` prefix, so `/jtl:pressure-test`,
`/jtl:goal-plan`, and so on.

**Checking the work**

| Skill | What it does |
|---|---|
| `pressure-test` | Attacks a plan before you build it: feasibility, simpler alternatives, failure modes. |
| `security-review` | Reviews code for the mistakes that actually get exploited. |
| `securitymaxx` | The longer security pass, with a false-positive discipline that drops pattern-matched noise instead of padding the report. |
| `tdd-repair` | Repairs a broken test suite without deleting the tests that were telling you something. |

**Planning and retrieval**

| Skill | What it does |
|---|---|
| `goal-plan` | Turns a goal into an ordered plan with preconditions, costs, and replanning when reality moves. |
| `rag-tuning` | Tunes a retrieval setup that is returning the wrong things. |

**Thirteen agents.** Specialists you summon by name, each with one job: `coder`,
`reviewer`, `researcher`, `planner`, `tester`, `system-architect`, `domain-modeler`,
`adr-architect`, `requirements-specification`, `production-validator`,
`tdd-london-school`, `coordinator-queen`, `typed-gate-example`.

**Two standalone scripts** that don't need the rest of the kit to run. They're described in
[AUDIT.md](AUDIT.md).

---

## The audit

The agent set is distilled from [ruflo](https://github.com/ruvnet/ruflo) (formerly
claude-flow) by rUv, MIT licensed. Before building it, we read the upstream repo line by
line and kept only what survived that read. Everything we cut, and why, is written down in
[AUDIT.md](AUDIT.md). That document is the actual pitch for this part of the kit. Read it
before you trust anything else here.

---

## What did I just install?

Three kinds of things landed on your machine, and none of them are mysterious:

- **Agents:** specialists you can summon by name. Think of them as coworkers with one job
  each. One might be good at writing tests, another at reviewing security. You call one in
  when its job matches what you're doing; Claude Code hands the conversation to it.
- **Skills:** playbooks that Claude follows automatically when the situation calls for
  them. You don't have to remember to invoke a skill; Claude recognizes when one applies
  and uses it, the same way a person reaches for a checklist without being told to.
- **Scripts:** two small, standalone tools, described in [AUDIT.md](AUDIT.md).

Nothing here talks to the network on install, nothing runs a setup step behind your back,
and there are zero dependencies to fetch. What you install is what's on disk.

---

## Try this now

Once the plugin is installed, open a project in Claude Code and try one of these:

```
Show me what agents and skills are available in this kit.
```

```
Use jtl:security-review to check this file for common mistakes.
```

```
I have a failing test. Can an agent from this kit help me fix it?
```

Claude will pick the right agent or skill for the job, or tell you plainly if nothing here
fits. It won't force-fit a tool that doesn't match.

---

## Uninstall

Same two-step shape, in reverse. Inside Claude Code:

```
/plugin uninstall jtl
/plugin marketplace remove jtl
```

The first line removes the kit itself; the second stops Claude Code from checking this
marketplace for updates. Either line is safe to run alone if you only want one effect.

---

## License and attribution

MIT throughout. Both copyright lines, rUv's for the original agent work and JTL Growth's
for the modifications, are in [LICENSE](LICENSE). Using, forking, and reselling this kit is
permitted under the same terms we used ourselves; keep the license file intact.

Full provenance and the honesty audit behind every kept and cut piece: [AUDIT.md](AUDIT.md).
