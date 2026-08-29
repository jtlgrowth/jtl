# Northwind Robotics: a complete hire

Fictional company, real output. Every block below is captured verbatim from
`run-demo.sh`; nothing here is illustrative.

Northwind has two agents (Mila on support, Otto on docs) and four places that
have to agree about each one: `roster.json` (the member list **and** the route
table), a job doc under `docs/team/`, an agent definition under `.claude/agents/`,
and the team table in `README.md`.

They are hiring Tess for partnerships.

## 1. Discover, and the overlap check

Question 3 of the interview (*new seat, or expansion of an existing one?*) is
answered with numbers, not memory.

```console
$ node scripts/discover.mjs --probe "partnership affiliate reseller co-marketing referral"
config      ./hire.config.json
org         Northwind Robotics
departments support, docs, growth, engineering
roster      2 seat(s): mila, otto
surfaces    6 (5 required)
guards      route-parity

OVERLAP CHECK for: "partnership affiliate reseller co-marketing referral"
  no keyword overlap with any existing seat, reads as a genuinely new seat

verify      node -e "const r=require('./repo/roster.json');if(!r.agents.includes('{{name}}'))process.exit(1);if(!r.routes['{{name}}'])process.exit(1);console.log('{{name}} present in agents and routes')"

$ node scripts/plan.mjs --answers answers-tess.json
```

## 2. Preview

Every write, a real diff of each, and the guard result. Nothing has touched disk.

```console

HIRE PREVIEW: Tess (tess) · growth · Partnerships

WRITES: 4 file(s)

  create                 ./repo/docs/team/tess.md   [job-doc]
  create                 ./repo/.claude/agents/tess.md   [subagent]
  set /agents/-          ./repo/roster.json   [roster-member]
  set /routes/tess       ./repo/roster.json   [roster-route]
  insert at line 11      ./repo/README.md   [readme-row]

SKIPPED (optional)
  - motor (condition "motor" not set)

DIFF

--- ./repo/docs/team/tess.md (new file)
+++ ./repo/docs/team/tess.md
  @@
  + # Tess: Partnerships
  + 
  + **Desk:** ACTIVE
  + 
  + **Runtime:** sonnet / medium effort
  + 
  + **Job:** every partner relationship reaching a yes or a no within two weeks, and nothing sitting in limbo after that.
  + 
  + **Inputs → outputs:** inbound partner enquiries, the reseller pipeline, and existing partner performance data → a qualified/declined verdict per partner with terms, and a weekly aged-deal list.
  + 
  + **Routed when:** anything naming a partner, reseller, affiliate, referral or co-marketing deal, including a partner complaint.
  + 
  + **Quality bar:** every verdict names the revenue number it turns on and the date it expires. Reviewed by: Priya.
  + 
  + **Boundaries:** recommends terms, never countersigns them. Never, even when asked: signs a contract, commits an engineering date, offers a discount outside the published rate card.
  + 
  + **Escalation:** anything above $10k annual value or touching exclusivity goes to Priya before the partner hears an answer. With no human awake: records the verdict as PENDING-HUMAN with the reason and stops. A partner never receives an unreviewed commitment.
  + 
  + **Cadence:** reactive: no standing motor; runs on routed work only.
  + 
  + **Earns the seat when:** aged deals over 14 days trend to zero and partner-sourced revenue is attributable by source.
  + 
  + **Folded when:** fold into Growth if partner-sourced revenue stays under 5% of total for two consecutive quarters.
  + 
  + <!-- hired 2026-08-20 via /hire -->
  + 

--- ./repo/.claude/agents/tess.md (new file)
+++ ./repo/.claude/agents/tess.md
  @@
  + ---
  + name: tess
  + description: Owns partner and reseller relationships end to end: qualification, terms, and the go/no-go, with every open deal aged and visible.
  + model: sonnet
  + tools: Read, Grep, Glob, WebSearch, WebFetch
  + ---
  + 
  + You are Tess, Partnerships. You own: every partner relationship reaching a yes or a no within two weeks, and nothing sitting in limbo after that.
  + 
  + Inbound partner enquiries, the reseller pipeline, and existing partner performance data comes in. A qualified/declined verdict per partner with terms, and a weekly aged-deal list goes out.
  + 
  + Invoked when: anything naming a partner, reseller, affiliate, referral or co-marketing deal, including a partner complaint.
  + 
  + Quality bar: every verdict names the revenue number it turns on and the date it expires. Reviewed by: Priya.
  + 
  + Boundaries: recommends terms, never countersigns them.
  + Never, even when asked: signs a contract, commits an engineering date, offers a discount outside the published rate card.
  + 
  + Blocked: anything above $10k annual value or touching exclusivity goes to Priya before the partner hears an answer. With no human awake: records the verdict as PENDING-HUMAN with the reason and stops. A partner never receives an unreviewed commitment.
  + 

--- ./repo/roster.json
+++ ./repo/roster.json
  @@
      "org": "Northwind Robotics",
      "agents": [
        "mila",
  -     "otto"
  +     "otto",
  +     "tess"
      ],
      "routes": {
        "mila": {
          "label": "Support",
          "skill": "mila",
  -       "keywords": ["ticket", "refund", "customer", "support", "escalation", "sla", "churn"]
  +       "keywords": [
  +         "ticket",
  +         "refund",
  +         "customer",
  +         "support",
  +         "escalation",
  +         "sla",
  +         "churn"
  +       ]
        },
        "otto": {
          "label": "Docs",
          "skill": "otto",
  -       "keywords": ["docs", "changelog", "release notes", "api reference", "tutorial", "guide"]
  +       "keywords": [
  +         "docs",
  +         "changelog",
  +         "release notes",
  +         "api reference",
  +         "tutorial",
  +         "guide"
  +       ]
  +     },
  +     "tess": {
  +       "label": "Partnerships",
  +       "skill": "tess",
  +       "keywords": [
  +         "partnership",
  +         "affiliate",
  +         "reseller",
  +         "co-marketing",
  +         "integration partner",
  +         "revenue share",
  +         "referral"
  +       ]
        }
      }
    }

--- ./repo/README.md
+++ ./repo/README.md
  @@
    | --- | --- | --- |
    | Mila | Support queue and refunds | Priya |
    | Otto | Product docs and changelog | Mila |
  + | Tess | every partner relationship reaching a yes or a no within two weeks, and nothing sitting in limbo after that | Priya |
    
    ## House rules
    

GUARDS
  PASS  route-parity: 3 entries, exact match

WILL VERIFY WITH
  $ node -e "const r=require('./repo/roster.json');if(!r.agents.includes('tess'))process.exit(1);if(!r.routes['tess'])process.exit(1);console.log('tess present in agents and routes')"

Nothing written yet. Approve, then: node apply.mjs --answers <file> --confirm

```

## 3. What refusal looks like

Same hire, with the `roster-route` surface removed from the config: the exact
mistake of adding an agent to the member list and forgetting the route table.

```console
$ node scripts/apply.mjs --answers answers-tess.json --confirm    # roster-route surface removed

REFUSED: nothing written. Guard(s) failed:

  - route-parity: only in a: [tess] · only in b: []
      an agent listed in /agents with no matching /routes entry breaks routing for the whole roster
exit code: 1
```

The member list and the route table are declared as a `set-equality` guard, so
this is caught against staged content. **Zero files were written.**

## 4. Apply

```console
$ node scripts/apply.mjs --answers answers-tess.json --confirm

HIRED Tess: 4 file(s) written:

  ./repo/docs/team/tess.md
  ./repo/.claude/agents/tess.md
  ./repo/roster.json
  ./repo/README.md

Optional surfaces skipped:
  - motor (condition "motor" not set)

VERIFY
  PASS  $ node -e "const r=require('./repo/roster.json');if(!r.agents.includes('tess'))process.exit(1);if(!r.routes['tess'])process.exit(1);console.log('tess present in agents and routes')"
        tess present in agents and routes

```

The result is committed under [`after/`](after/), `run-demo.sh --apply` diffs
its own output against it, so the transcript above stays honest.
