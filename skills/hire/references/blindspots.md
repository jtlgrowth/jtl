# Why batches B and C exist

Batch A (name, job, department) gets asked every time. Nobody forgets to name the thing.

Batches B and C are the questions that get skipped, and each one maps to a specific way a
roster breaks. This file is the argument for not skipping them.

---

## Q5: model tier

**Skipped because:** it feels like an optimisation you can do later.

**What breaks:** a cheap model on an open-ended job costs *more*, not less. Weak planning
is paid for in extra tool calls, and every call's output re-enters the context window at
full price on every subsequent turn. The observation that produced this rule: an
open-ended audit on the cheap tier burned 66.7k tokens across 24 tool calls, against ~42k
for comparable work on the top tier. Different tasks, one observation. Treat the
magnitude as unmeasured and the mechanism as the durable part.

**The fix:** cheap tier only for single-shot lookups, and only with a stated tool-call
ceiling in the prompt.

---

## Q6: tool scope

**Skipped because:** the new seat "obviously" needs the same tools as everyone else.

**What breaks:** this is the one that fails catastrophically instead of quietly. A real
dispatcher validates its permission table against its roster with a **set-equality**
check: every seat must appear in both. Add a seat to the roster without adding its
permission entry and the validation raises. The fallback is not "that one seat gets no
tools". The fallback is **every seat drops to read-only**, silently, on the next tick.

One forgotten entry disarms the whole team. That is why `hire` declares this as a `guard`
and refuses the entire write when it fails, rather than writing the roster entry and
trusting someone to remember the other half.

**The fix:** the guard. Not a note in a checklist.

---

## Q7: inputs → outputs

**Skipped because:** the role name feels self-explanatory.

**What breaks:** if nobody can name the artifact that leaves, the seat is a job title. Six
months on, its "work" is a series of messages nobody can point at, and its performance
cannot be argued about in either direction.

---

## Q8: reactive or standing

**Skipped because:** motors get added later, informally.

**What breaks:** a scheduled job created in the same motion as the seat, by someone in a
hurry, is a job nobody has read the body of. `hire` generates motors **disabled**, so the
schedule is a deliberate second act.

---

## Q9: hard NEVERs

**Skipped because:** "it wouldn't do that."

**What breaks:** it does that. NEVERs are not preferences, they are refusals that survive
being asked directly and politely. "Never moves money" is why a finance seat can be given
the whole ledger. A seat with no NEVERs either has no power, or nobody has thought about
what its power is.

---

## Q10: quality bar and reviewer

**Skipped because:** review feels like process overhead on a small team.

**What breaks:** unreviewed output is indistinguishable from reviewed output right up
until a client sees it. "Self-review only" is a legitimate answer and takes two seconds to
record. What is not legitimate is leaving it unanswered and discovering the gap during the
incident.

---

## Q11: escalation and unattended behavior

**Skipped because:** someone is always around.

**What breaks:** someone is not always around. An agent with no unattended rule invents
one at 3am, and the invented rule is usually "proceed", because proceeding looks like
helpfulness. The two honest answers are "record the state and stop" and "proceed, but only
within this boundary". Both are fine. Silence is not.

---

## Q12: success metric and decommission condition

**Skipped because:** you just hired them, why plan the ending.

**What breaks:** rosters only grow. Every seat added is permanent by default, because
folding one later requires someone to make a judgment call in public with no criteria to
point at. A real example: a roster went 22 seats to 16 in a single restructure (six seats
folded at once) and not one of them had a written decommission condition. The merge was
correct and it still cost a day of arguing, because the criteria had to be invented
retroactively.

**The fix:** write the trigger at hire time, when nobody is defensive about it. "Fold into
Growth if partner-sourced revenue stays under 5% for two consecutive quarters" is a
sentence that costs nothing on day one and settles the argument on day four hundred.
