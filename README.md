# JTL AgentKit

**A curated set of agents and skills for [Claude Code](https://claude.com/claude-code).**

This kit is distilled from [ruflo](https://github.com/ruvnet/ruflo) (formerly claude-flow)
by rUv, MIT licensed. Before building it, we read the upstream repo line by line and kept
only what survived that read. Everything we cut, and why, is written down in
[AUDIT.md](AUDIT.md) — that document is the actual pitch for this kit. Read it before you
trust anything else here.

No performance claims, no inflated counts, no invented capabilities. Just a curated set of
agents, skills, and two small standalone scripts.

---

## Install in one line

You need Claude Code installed first. If you don't have it yet, get it from
[claude.com/claude-code](https://claude.com/claude-code) — it walks you through a normal
app install, no terminal required to start. Once it's installed, open it (on Mac, open
Terminal and type `claude`; on Windows, open PowerShell and type `claude`).

Inside Claude Code, type these two lines, one at a time, and press Enter after each:

```
/plugin marketplace add jtlgrowth/agentkit
/plugin install agentkit@agentkit
```

That's it. Claude Code downloads the kit and it's ready to use — nothing else installs
alongside it, nothing runs in the background, no accounts to make.

Works the same way on Mac and on Windows — the two lines above are typed inside Claude
Code itself, not in your regular terminal, so there's nothing OS-specific about them.

### If you're comfortable in a terminal

There's also a small convenience script, `install.sh`, in this repo. It checks that Claude
Code is on your machine and then runs the same two commands for you:

```bash
./install.sh
```

It does not install Claude Code itself, does not fetch anything beyond this repo, and does
not run anything in the background — it just automates the two lines above.

---

## What did I just install?

Three kinds of things landed on your machine, and none of them are mysterious:

- **Agents** — specialists you can summon by name. Think of them as coworkers with one job
  each: one might be good at writing tests, another at reviewing security. You call one in
  when its job matches what you're doing; Claude Code hands the conversation to it.
- **Skills** — playbooks that Claude follows automatically when the situation calls for
  them. You don't have to remember to invoke a skill; Claude recognizes when one applies
  and uses it, the same way a person reaches for a checklist without being told to.
- **Scripts** — two small, standalone tools that don't need the rest of the kit to run.
  They're described in [AUDIT.md](AUDIT.md) if you want the specifics.

Nothing here talks to the network on install, nothing runs a setup step behind your back,
and there are zero dependencies to fetch. What you install is what's on disk.

---

## Try this now

Once the plugin is installed, open a project in Claude Code and try one of these:

```
Show me what agents and skills are available in this kit.
```

```
Use the security-review skill to check this file for common mistakes.
```

```
I have a failing test — can an agent from this kit help me fix it?
```

Claude will pick the right agent or skill for the job, or tell you plainly if nothing here
fits — it won't force-fit a tool that doesn't match.

---

## Uninstall

Same two-step shape, in reverse. Inside Claude Code:

```
/plugin uninstall agentkit
/plugin marketplace remove jtlgrowth/agentkit
```

The first line removes the kit itself; the second stops Claude Code from checking this
marketplace for updates. Either line is safe to run alone if you only want one effect.

---

## License and attribution

MIT, same as upstream. Both copyright lines — rUv's for the original work, JTL Growth's
for the modifications — are in [LICENSE](LICENSE). Using, forking, and reselling this kit
is permitted under the same terms we used ourselves; keep the license file intact.

Full provenance and the honesty audit behind every kept and cut piece: [AUDIT.md](AUDIT.md).
