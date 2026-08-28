# Contributing

Thanks for wanting to make this sharper. Two kinds of contribution matter most here, and
both have a higher bar than "it seems right."

## Adding or changing a check

The checklist is ten items on purpose. A skill that scores forty things gets skimmed; one
that scores ten gets read. So a new check has to earn its slot, usually by replacing one.

A check proposal needs all four of these:

1. **The failure it catches**, described concretely — what an attacker actually does, not
   a category name.
2. **How an agent verifies it** — the exact grep, the exact `curl`, the exact config page.
   If there is no mechanical way to check it, it does not belong here.
3. **What counts as PASS**, stated so two different agents reach the same verdict.
4. **The common false pass** — the thing that looks like a PASS and isn't. This field is
   not optional; it is most of the value.

Open an issue before the PR. Cheaper for both of us than a rejected diff.

## Adding a false-positive rule

`references/false-positives.md` is the reason this skill is usable on a recurring basis.
Every rule there exists because a real audit produced a finding that wasted real time.

To add one, say what noisy finding it kills and why that finding is not actionable. Rules
that would suppress a genuinely exploitable bug get rejected — when a rule is arguable,
the finding survives and gets marked TENTATIVE instead.

## Changing the scorecard design

Templates are self-contained: no build step, no JavaScript, no external requests, opens on
`file://`. Keep it that way. Colors come from the `:root` CSS variables so brand
onboarding can rewrite them — do not hardcode a hex outside that block.

Check both `template.html` and `template-dark.html` after any change, at 1440px and 390px.

## Demo scorecards

Demos audit **fictional** applications only. Never open a PR that scores a real named
third party. Publishing "this company scores 3/10" is a problem for them and for this
repo, regardless of whether the finding is correct.

## Scope of the tool itself

securitymaxx is read-only by design: it reads code, reads config, and makes ordinary HTTP
requests. Contributions that add exploitation, credential testing, brute forcing, or
destructive probes will be closed. There are better tools for that, run by people with a
signed scope document.
