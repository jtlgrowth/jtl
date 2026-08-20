---
name: rag-tuning
description: Starting-point defaults for tuning a retrieval-augmented memory/search pipeline — RRF fusion constant, MMR diversity lambda, near-duplicate cosine cutoff, recency decay rate, template-based query expansion, and pipeline ordering. Use when building or tuning semantic search/recall over your own corpus; treat every number here as a default to eval against your data, not a proven-optimal setting.
---

# rag-tuning

Standard, citable information-retrieval defaults for a multi-stage semantic retrieval
pipeline. These are reasonable starting points, not measured results on any particular
corpus — eval each one against your own data before trusting it in production.

## Pipeline order

```
query → expand → multi-query fan-out + RRF → recency decay → MMR → interleave
```

1. **Query expansion** — template-based variant generation (no LLM call). Cheap,
   deterministic, and doesn't add a model dependency to every search.
2. **Multi-query fan-out + RRF** — run each expanded variant as its own retrieval, then
   fuse the ranked lists with Reciprocal Rank Fusion.
3. **Recency boost** — apply exponential decay to fused scores based on each result's
   timestamp.
4. **MMR diversity re-ranking** — trade off relevance against redundancy so the top-k
   isn't five near-duplicate hits.
5. **Interleave** — round-robin results from distinct sources/sessions so one source
   doesn't dominate the final list.

## Defaults to start from

| Parameter | Default | Notes |
|---|---|---|
| RRF constant `k` | `60` | The canonical value from the original Reciprocal Rank Fusion paper (Cormack et al.). Score for a result at rank `r` in a list is `1 / (k + r)`, summed across lists. |
| MMR `lambda` | `0.7` | Weight toward relevance vs diversity; `1.0` = pure relevance, `0.0` = pure diversity. `0.7` favors relevance while still pruning near-duplicates. |
| Near-duplicate cosine cutoff | `0.92` | Pairs above this cosine similarity are treated as duplicates for dedup/diversity purposes. |
| Recency decay | `0.95` per day | Exponential: a result's score is multiplied by `0.95^(days_old)`. Tune the base against how fast your corpus actually goes stale. |
| Query expansion | template-based, no LLM | Deterministic synonym/rephrase templates, not a generative call — keeps expansion cheap and reproducible. |

## How to use this

Treat every number above as a tuning starting point, not a proven-optimal setting for
your corpus. Before shipping:

- Build a small labeled eval set from your own data (queries + known-good results).
- Measure recall@k / precision@k with the defaults above.
- Sweep `k`, `lambda`, and the cosine cutoff around the defaults and keep whatever
  actually improves your eval numbers — don't assume the paper's constant or another
  team's tuning transfers to your corpus.

Do not carry forward any performance multiplier ("Nx faster", "Nx better recall") from
elsewhere without your own measurement — this skill deliberately ships no benchmark
numbers, only IR defaults.

---

Adapted from ruflo (github.com/ruvnet/ruflo) rag-memory plugin documentation, MIT.
Upstream's own README for this feature publicly retracted an earlier "150x–12,500x"
performance claim as an unreproduced artifact — this skill carries forward only the
correctly-cited IR defaults, none of the retracted numbers.
