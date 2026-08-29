# The Audit

JTL AgentKit is a distillation of [ruflo](https://github.com/ruvnet/ruflo) (formerly claude-flow) by rUv, MIT licensed. Before building this kit we ran a three-track audit of the upstream repo at commit `fa13ee4` (2026-08-20): one auditor on the agent definitions, one on the core implementation and supply chain, one on a sample of the 38 plugins. **Everything in this kit survived that audit. Everything that didn't is listed below, with reasons.** That's the deal: no number appears in this repo that we didn't verify, and nothing installs that we didn't read.

## What we kept (and why it's real)

| Component | Upstream origin | Why it survived |
|---|---|---|
| `scripts/tdd-repair.mjs` | `plugins/ruflo-testgen` | 313 lines, self-contained, zero dependencies. Spawns headless Claude Code with a per-attempt dollar budget and uses the failing test itself as the fitness function: no LLM judging its own homework. We read every line. |
| `scripts/similarity.mjs` | `plugins/ruflo-metaharness` | Pure-math weighted similarity (cosine + categorical + Jaccard) with per-dimension explainability. Dependency-free, unit-testable. |
| Security-review skill | `plugins/ruflo-security-audit` README | An incident-derived vulnerability checklist with named fixes (command-injection via `execSync`, TypeScript cast bypasses, loader-hijack env vars, secrets at rest). Reads like a real postmortem, not OWASP boilerplate. |
| RAG-tuning skill | `plugins/ruflo-rag-memory` | Standard, correctly-cited IR defaults (RRF k=60 from the original paper, MMR λ=0.7, recency decay 0.95/day). Notably, upstream publicly retracted its own earlier "150x–12,500x" claims in this same README: we kept the honest version. |
| Goal-plan skill | `plugins/ruflo-goals` | A genuinely good plan format: every step carries preconditions, effects, and cost, with explicit replan triggers. Upstream calls this "GOAP A*"; there is no A* search in the code, so we don't call it that. |
| Curated agents | `.claude/agents/`, `plugins/*/agents/` | Hand-picked from ~300 files after deduplication (see below). Each kept agent has substantive, specific instructions. |

## What we cut, and why

- **"Rust-based architecture."** The repo is 0.66% Rust (4,120 lines vs ~620,000 of TypeScript), the Rust is not wired into the shipped CLI, and the `Cargo.toml` contains a comment stating the workspace manifest exists so "the repo-scorecard analyzer sees ruflo's Rust components." We cut every claim built on this.
- **Fabricated benchmarks.** Upstream's own commissioned audit (`docs/reviews/intelligence-system-audit-2026-05-29.md`) found headline multipliers were "hardcoded doc strings with no benchmark behind them," including a Flash Attention "speedup" computed as `2.49 + Math.random()*4.98` at runtime, and HNSW claims of 150x–12,500x that measured 1.48x. Credit where due: they audited themselves and patched some of it. We simply ship no performance numbers at all.
- **The "100+ specialized agents" roster.** Reachable only by counting the same personas up to three times (byte-identical copies in category folders, auto-generated wrapper re-exports, some with corrupted double frontmatter from the generation script, and 8-line stubs that restate their filename). Our count after deduplication and a substance bar: the agents in this repo, each one readable in one sitting.
- **Consensus theater.** "Byzantine, Raft, Gossip" consensus is a string flag passed to an external tool; there is no consensus implementation in the plugins that advertise it.
- **External alpha dependencies.** Core features delegate to `agentdb@3.0.0-alpha`, `@ruvector/sona@0.1.5`, and an unpinned `agentic-flow@alpha` fetched at runtime; the CLI ships a postinstall script whose job is patching the broken alpha package it depends on. This kit has **zero runtime dependencies**.
- **Silent installs.** One upstream plugin's postinstall runs `npm install -g agent-browser@latest`: global, unpinned, unprompted. This kit has **no postinstall hooks, no auto-install, no network calls during install** beyond cloning this repo.
- **310+ MCP tools.** Mostly wrappers over the external packages above, or duplicates of what Claude Code already does natively (browser, memory, tasks, terminals, GitHub). Claude Code users don't need a second copy of their own tools.

## What "improved, not copied" means here

1. Zero dependencies, zero postinstall, nothing fetched at runtime.
2. Every retained file was read by a human-directed audit before inclusion; origin credited in file headers.
3. Skills rewritten for clarity and honesty (no invented capabilities, no renamed marketing).
4. The agent roster is curated for substance, not padded for a count.
5. This document exists.

## License

MIT, same as upstream. Both copyright lines, rUv's for the original work, JTL Growth's for modifications, are in [LICENSE](LICENSE). Using, forking, and reselling this kit is permitted under the same terms we used ourselves; keep the license file intact.
