# False positives: what not to report

Zero noise beats zero misses.

That trade sounds wrong until you have watched it play out. A security report with forty
findings, of which six are real, does not get acted on. It gets skimmed once, filed, and
never opened again, and the six real ones die with it. A report with four findings, all
real, gets fixed on Tuesday. The filter below exists so the second thing happens.

Adapted from the exclusion list in [garrytan/gstack](https://github.com/garrytan/gstack)'s
`/cso` command.

## The confidence bar

Every finding carries a confidence score. On recurring or scheduled runs, **anything below
8/10 is dropped silently**: not reported as "possible", not listed in an appendix.
Dropped.

On a one-off deep audit you may include lower-confidence findings, but they must be marked
`TENTATIVE` and sorted below the confirmed ones. Never let an uncertain finding sit at the
top of a report; it costs the reader trust in everything under it.

## Hard exclusions

Do not report these. They are true observations that are not actionable findings.

| Excluded | Why |
|---|---|
| Denial of service, resource exhaustion, rate limiting | Availability, not a vulnerability, and usually a platform concern. **Exception: unbounded LLM or metered spend on a public endpoint, always report.** That is financial risk with an attacker-controlled magnitude |
| "Missing hardening" with no concrete attack | A missing header is not a vulnerability unless you can state what it lets someone do |
| Race conditions | Only when you can describe a concrete interleaving that produces a concrete bad state |
| Memory safety in memory-safe languages | Not a thing in JavaScript, Python, Go, Java, or safe Rust |
| Anything in test files, fixtures, or seed data | Not deployed. **Except a real credential in a fixture**: that is finding #7 and it counts |
| Log spoofing / log injection | Theoretical in almost every real application |
| SSRF where the attacker controls only the path | Not SSRF. Host control is what makes it SSRF |
| Missing audit logs | A compliance gap. Raise it as a recommendation, never as a vulnerability |
| Weak randomness outside a security context | `Math.random()` for a UI animation delay or a shuffled list is fine |
| Dev-only Dockerfiles, compose files, local scripts | Never deployed. Confirm they are not deployed, then move on |

## Precedents

Settled questions. Do not re-litigate them in every audit.

- **Environment variables and CLI flags are trusted input.** Someone who can set them
  already has the level of access the "attack" would grant.
- **React, Vue, and Angular escape by default.** XSS findings there require an escape
  hatch (`dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrust*`) or an unsanitized
  `href`/`src` binding. Named, with the line.
- **Client-side JavaScript does not need authentication.** It runs on the user's machine.
  The server-side check is the check.
- **UUIDv4 is unguessable.** Do not report UUIDs as predictable identifiers.
- **Root inside a local dev container is fine.** In a production image it is a finding.
- **A publishable/anon key in the browser is correct.** That is what it is for. The finding
  is the *service-role* key, or an anon key on a table with no row-level security, which
  is a different finding, phrased about the missing policy.

## Not excluded: audit these

- **`SKILL.md` and other agent instruction files are executable prompt code, not
  documentation.** They steer an agent that holds real credentials and a shell. Never skip
  them as "just markdown". A prompt-injection path in a skill file is a finding.
- **Deployed bundles, source maps, and git history.** Covered in check 7 and worth
  repeating, because these are where secrets actually live while the source tree looks
  clean.
- **CI/CD configuration.** Workflow files handle secrets and often run on untrusted pull
  requests.

## Proof discipline

Mark every surviving finding:

- **VERIFIED**: traced in the code or reproduced with a probe. Cite `file:line` or the
  command and its output.
- **UNVERIFIED**: strongly suspected, not confirmed. Say exactly what would confirm it.
- **TENTATIVE**: pattern-matched only. Sorted last, or dropped on a recurring run.

**Variant sweep.** One verified finding is rarely alone. Grep the whole codebase for the
same pattern and report the rest as "Variant of Finding #N". The second instance is
usually in the file nobody remembered.

**Blind verification, for high-stakes runs.** Hand each finding to a fresh-context
reviewer with only the `file:line` and these rules, not your reasoning, which would
anchor them. Ask for an independent confidence score. Discard anything that comes back
below 8/10. Your own second look is not independent; you already believe the finding.

## Reporting a finding

Four sentences, in this order:

1. **What is wrong**, at a specific location.
2. **What it lets someone do**: the concrete consequence, not the category name.
3. **The evidence**: `file:line`, or the command and its output.
4. **The fix**, specific enough to act on.

If you cannot write sentence 2 without hedging, it is not a finding yet.
