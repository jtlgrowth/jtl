---
name: pressure-test
description: "Adversarial critique protocol. State a falsifiable claim, steelman it, run three attacks (feasibility, simpler alternative, failure mode), then rule PROCEED, RESHAPE, or KILL. Also sets the rules for receiving criticism without flattery. Triggers on '/pressure-test', 'pressure test this', 'steelman this', 'attack this idea', 'should we do X'."
license: MIT
---

# Pressure Test: adversarial critique protocol

Discipline for stress-testing a decision before you commit to it. Runs on whatever model
loaded it. No API keys, no scripts, no dependencies.

**Trigger:** "pressure test this", "/pressure-test", "steelman this", "attack this idea",
"should we do X", or any moment you are about to commit real money, real time, or real
architecture on a hunch.

## The protocol

1. **State the claim.** One falsifiable sentence. If you cannot state it, you have a
   vibe, not a decision. Go get the missing fact first.
2. **Steelman FOR.** The strongest honest case, 5 lines or fewer, evidence cited. No
   strawmen. If the best case for the idea is weak, say so here rather than hiding it.
3. **Three attacks.** Each ends with its own verdict line.
   - **ATTACK 1, feasibility.** What breaks. Verify every load-bearing assumption live
     instead of assuming it: open the file, run the command, call the API. A claim
     resting on an unverified assumption automatically fails this attack.
   - **ATTACK 2, simpler alternative.** Does something that already exists do 80% of
     this? Name the exact existing thing. "New thing" loses ties to "existing thing
     extended". For build decisions, produce two or three approaches including one
     minimal viable and one ideal, and weigh them equally. Never pick minimal just
     because it is smaller.
   - **ATTACK 3, failure mode.** Worst realistic case, how far the damage spreads, and
     how you would detect it. A failure you cannot detect is an automatic RESHAPE.
4. **Verdict: PROCEED, RESHAPE, or KILL.** Cite which attacks survived. RESHAPE has to
   say what shape survives, not just that the current one does not.

**Wrong is not the same as incomplete.** An attack fails only if the claim as stated
would lead you to do the wrong thing. A claim that is correct but incomplete is PROCEED,
with the missing pieces listed as follow-ons under the verdict. Reserve RESHAPE for a
claim whose stated action itself has to change. Reserve KILL for a claim whose core does
not survive any repair.

**Calibration.** PROCEED is a real verdict, not a formality. If all three attacks survive,
rule PROCEED and say so plainly in one line. A protocol that never approves anything
carries no information and is just as broken as one that approves everything. Never
manufacture an attack to avoid approving, and never downgrade to RESHAPE for wanting more
rigor. RESHAPE needs a named defect. "Could be more thorough" is not a defect.

## Receiving criticism without flattery

Applies to a reviewer, a teammate, or your own client. No rank gets a pass.

- Banned openers: "You're absolutely right", "Great catch", "Good point". Any concession
  made before verification is worthless to both sides.
- Every review item gets exactly one of: `AGREE` with evidence, `DISPUTE` with evidence,
  or `CLARIFY` with a question. No blanket concessions, no blanket rebuttals.
- Never implement a fix you cannot restate the reason for.
- Judge by evidence, not by who said it.

## Output format

A compact block, nothing else.

```
CLAIM: <one falsifiable sentence>
STEELMAN: <5 lines or fewer, evidence cited>
ATTACK-1 (feasibility): <finding> :: <survives|fails>
ATTACK-2 (simpler alt): <existing thing named, or none found> :: <survives|fails>
ATTACK-3 (failure mode): <worst case + how you detect it> :: <survives|fails>
VERDICT: <PROCEED|RESHAPE|KILL>
```

## Rules

- No essay. The block above is the deliverable. Each attack is one to three lines.
- A verdict with no stated claim, or an attack with no verify step where one was
  possible, is incomplete. Redo it.
- Skipping to PROCEED without running all three attacks is not a shortcut, it is a miss.
