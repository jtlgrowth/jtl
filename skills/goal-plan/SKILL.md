---
name: goal-plan
description: Structure a multi-step objective as a precondition-effect plan before executing it: explicit goal state, current state, per-step preconditions/effects/costs, risk factors, fallback, and replan triggers. Use for complex objectives with dependent steps that may need to adapt mid-execution; skip for single-file edits or one-shot lookups.
---

# goal-plan

A plan format for objectives that have multiple dependent steps and may need to change
course mid-execution. The honest name for this is **precondition-effect planning**: it
is not GOAP, not A*, and doesn't claim any search algorithm; it's a discipline for
writing down what must be true before each step and what becomes true after, so a
mid-execution surprise has a clean place to attach a replan instead of derailing the
whole effort.

## When to use

Use when an objective:
- requires multiple steps with dependencies between them, and
- has enough uncertainty that some step might fail or produce a surprise.

Skip it for a single file edit, a one-shot lookup, or anything you'd finish before
finishing writing the plan.

## Steps

1. **Define goal state**: what does "done" look like? List concrete, checkable success
   criteria.
2. **Assess current state**: what's true right now? What assets, code, or
   infrastructure already exist?
3. **Identify the gap**: what has to change between current state and goal state?
4. **Inventory actions**: for each candidate action, list:
   - **Precondition**: what must be true before this action can run
   - **Effect**: what becomes true after it succeeds
   - **Cost**: a rough estimate of time, complexity, or risk
5. **Sequence the plan**: order actions so each one's precondition is satisfied by an
   earlier action's effect (or by current state).
6. **Execute**: work through steps in that order:
   - before each step, verify its precondition still holds
   - after each step, verify its effect was actually achieved (don't assume)
7. **Monitor and replan**: if a step fails or produces something unexpected, don't push
   through: reassess current state and regenerate the remaining steps from there.

## Plan output format

```
Goal: [concrete objective]
Current State: [key facts]
Plan Cost: [estimated effort]
Steps:
  1. [action]: precondition: [X], effect: [Y], cost: [Z]
  2. [action]: precondition: [Y], effect: [W], cost: [Z]
  ...
Risk Factors: [what could force a replan]
Fallback: [alternative approach if the primary path fails]
```

## Replan triggers

Stop and regenerate the remaining steps when any of these happen. Don't try to patch
around them in place:

- An action fails (its precondition turns out not to have held, or the action itself
  errors).
- The action succeeds but produces unexpected side effects.
- Estimated cost for the remaining plan exceeds your threshold.
- An external dependency the plan relied on becomes unavailable.

---

Adapted from ruflo (github.com/ruvnet/ruflo), MIT. Upstream calls this format "GOAP" with
an "A* search" over the state space; there is no A* implementation behind it, so this
version doesn't use that name.
