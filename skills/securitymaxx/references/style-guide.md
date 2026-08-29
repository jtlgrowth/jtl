# Style guide

Design tokens for the scorecard. Every template reads these from a single `:root` block,
so changing them here changes every report you generate.

Edit this file directly, or let the skill fill it in from your website, see
[Onboarding](#onboarding) below.

## Tokens

| Role | Default (light) | Default (dark) | Used for |
|---|---|---|---|
| `--paper` | `#faf7f2` | `#14110e` | Page background |
| `--card` | `#ffffff` | `#1c1815` | Table and tile surfaces |
| `--ink` | `#1a1613` | `#f5f1ea` | Body and heading text |
| `--muted` | `#8a8378` | `#8d857a` | Labels, kickers, secondary text |
| `--line` | `#e8e2d8` | `#2e2822` | Borders and rules |
| `--pass` | `#1d7a4c` | `#4ec48a` | PASS verdicts |
| `--fail` | `#b3362a` | `#f2705f` | FAIL verdicts and fix cards |
| `--warn` | `#b07816` | `#e0a63c` | PARTIAL verdicts |
| `--platform` | `#3a5a9b` | `#7fa3e8` | PLATFORM verdicts |

Two font stacks: `--font-sans` for everything, `--font-mono` for evidence, paths, and
commands. Evidence is quoted material: it should look like it came from a terminal,
because it did.

## Rules

**Colour carries meaning here, so it is not decorative.** Pass green and fail red are the
two things a reader looks for before reading a single word. Keep them clearly distinct from
each other and from the page background, in both themes.

**Never encode a verdict in colour alone.** Every pill also carries its word: `PASS`,
`FAIL`, `PARTIAL`, `PLATFORM`, `UNKNOWN`. Roughly one in twelve men has some form of colour
vision deficiency, and a red/green scorecard is exactly the worst case for it. The text
label is not redundancy, it is the actual signal.

**Contrast holds in both themes.** Body text meets WCAG AA (4.5:1) against its own
background. If a brand colour fails that after onboarding, adjust its lightness for text
use and keep the original for fills.

**Evidence stays monospace and stays readable.** It is the most important column on the
page. Do not shrink it below 12.5px to win an argument with a long line, let the cell
wrap instead.

## Onboarding

Ask:

```
onboard securitymaxx to https://yoursite.com
```

The skill will:

1. Fetch the homepage.
2. Extract the dominant palette and the font stack in use.
3. Map what it found onto the semantic roles above: background to `--paper`, body text to
   `--ink`, the primary action colour to `--accent`, and so on.
4. Derive `--pass` / `--fail` / `--warn` if the brand has no obvious candidates, keeping
   them distinguishable rather than forcing them to match.
5. Show you a proposed diff of this table.
6. On approval, write the tokens here.

Every scorecard generated after that uses them, and the report looks like it came from your
company rather than from a template.

**One thing onboarding will refuse to do:** it will not adopt a brand palette that puts
`--pass` and `--fail` close enough together to be confused, even if that is genuinely what
the site uses. A scorecard whose verdicts are hard to tell apart has failed at its only
job. It will pick the nearest distinguishable pair and say so in the diff.
