---
name: securitymaxx
description: Score a shipped app against a 10-point security checklist with cited file:line or live-probe evidence, then emit a designed HTML scorecard. Unverifiable items score zero, so there are no hallucinated passes. Use when asked to audit an app's security, check whether something is safe to launch, review a vibe-coded or AI-generated codebase before real users touch it, or produce a security scorecard. Trigger: /securitymaxx <repo-or-url>, "audit this app's security", "is this secure enough to ship", "security scorecard".
license: MIT
---

# securitymaxx

Score one surface 0–10 against the checklist below. Every verdict carries evidence you
actually read or ran **this session**. Produce an HTML scorecard.

The whole point is the evidence rule. An audit that says "looks fine" is worth nothing,
and an LLM will happily produce ten of those in four seconds. Here, a PASS you cannot cite
is not a PASS: it is UNKNOWN, and UNKNOWN scores zero. That single rule is what makes the
number mean something.

## Authorization: read this before running

Run this against **systems you own, or systems you have written authorization to test.**

The skill is read-only by design:

- Static analysis: read and grep source, config, and built output.
- Live probes: ordinary HTTP requests only: headers, redirect chains, fetching a public
  bundle the browser would fetch anyway.
- **Never**: exploit attempts, credential testing, brute forcing, injection payloads,
  scanning hosts you were not pointed at, or anything that writes to the target.

If asked to audit a third party's system without authorization, refuse and say why. If
asked to go beyond read-only, refuse the escalation and continue with the read-only audit.

## Process

1. **Scope the surface.** One surface per scorecard: a repo, a deployed URL, or both.
   Establish the stack before scoring: framework, auth provider, database, host, and
   every metered backend. The stack determines which checks are code checks and which are
   platform config checks, and getting this wrong produces a scorecard full of confident
   nonsense.

   If the surface is pure no-code pages with no custom auth or database, say so up front.
   Half the checklist collapses to PLATFORM rows and the audit is honestly a config
   review, which is a fine outcome, as long as the report does not dress it up as more.

2. **Gather evidence.** Work through `references/checks.md`, which gives each check its
   verification command, its PASS bar, and the false pass that specifically defeats it.
   Static and live both: item 7 in particular is only meaningfully checked against
   **deployed** output, because that is where leaked keys actually live.

   Auditing several surfaces at once? One subagent per surface, one scorecard each. Do not
   merge distinct systems into a single score.

3. **Cut the noise.** Apply `references/false-positives.md` before anything reaches the
   report. Zero noise beats zero misses: a report nobody finishes reading catches nothing.
   Findings below 8/10 confidence are dropped on recurring runs.

4. **Score.** Count PASS as 1, PARTIAL as 0.5, everything else as 0.

   | Verdict | Meaning |
   |---|---|
   | **PASS** | Verified, with cited evidence from this session |
   | **PARTIAL** | Partly in place, or verified for some paths and not others |
   | **FAIL** | Verified absent or verified wrong |
   | **PLATFORM** | Handled by the host: name the platform *and* verify the setting where it is reachable |
   | **UNKNOWN** | Could not verify. Scores 0. Say what you would need to resolve it |

   Verdict line: **≥ 7 holding · < 7 lock in tonight.** Then rank the fixes by blast
   radius, not by how easy they are: a leaked service-role key outranks a missing header
   every time.

5. **Report.** Copy a template from `assets/` and fill it in. Write
   `securitymaxx-<surface>-<YYYY-MM-DD>.html` to the working directory.

   - `template.html`: light, ten rows, evidence column. The default.
   - `template-dark.html`: same, dark.
   - `template-full.html`: adds the summary bento, ranked fix cards, and a methodology
     footer. Use when the report goes to someone who was not in the room.

   Then tell the user the score, the verdict line, and the single highest-blast-radius fix.
   Do not narrate all ten rows back at them; the scorecard is the artifact.

## The 10 checks

Summarized here; `references/checks.md` carries the verification detail and is the file to
actually work from.

1. **Forces HTTPS**: `http://` redirects to `https://`, HSTS present.
2. **Passwords hashed**: bcrypt / argon2 / scrypt, or a platform auth provider. Never
   plaintext, never reversible.
3. **Bot protection**: every public POST has CAPTCHA, honeypot, or a rate limit.
4. **Sessions expire**: finite token TTL with refresh rotation.
5. **CSRF protection**: tokens on state-changing forms, or `SameSite` cookies with no
   cookie-authenticated cross-site writes.
6. **Reset links expire and are single-use**: TTL ≤ 1h, consumed on use.
7. **Scoped database key, not master**: the browser gets the anon key. The service-role
   key never leaves the server.
8. **Clean logs**: no passwords, tokens, or card numbers in log statements or stored logs.
9. **Billing alerts**: a spend cap or alert on every metered backend.
10. **Automated backups**: a real schedule, on a plan tier that actually includes it.

## Hard rules

- **No fabricated passes.** Every PASS cites something you read or ran this session. If you
  cannot cite it, it is UNKNOWN and it scores 0. This rule is the product.
- **Audit deployed artifacts, not just source.** Secrets leak through bundles, source maps,
  and committed `.env` files, and the source tree looks clean the whole time.
- **Never paste a real secret into the report.** Name the file and line, redact the value.
  These reports get forwarded.
- **Verify platform claims where the setting is reachable.** "Supabase handles it" is a
  guess until the dashboard value is read. Where it genuinely is not reachable, say
  PLATFORM and name what was assumed.
- **Re-score only after a fix is verified through its real trigger.** A commit is not a
  fix; a passing probe against production is.

## Brand onboarding

Out of the box the scorecard renders in a neutral editorial palette, fine to send as-is.
To make it look like your own reports, ask:

> onboard securitymaxx to https://yoursite.com

The skill fetches the homepage, extracts the dominant palette and font stack, maps them to
the semantic roles (`paper`, `ink`, `muted`, `accent`, `pass`, `fail`), shows a diff, and
on approval writes the tokens to `references/style-guide.md`. Every scorecard after that
uses them. Full flow in `references/style-guide.md`.

## Credits

The ten checks come from **@millee.md**, "Securitymaxxing knowledge (vibecode edition)
pt. 3" on TikTok: a plain-language list aimed at people shipping AI-generated apps, which
is exactly the audience that needs it. This skill is that list plus an evidence
requirement, a false-positive filter, and a report.

The false-positive rules in `references/false-positives.md` are adapted from the exclusion
list in **garrytan/gstack**'s `/cso` command.
