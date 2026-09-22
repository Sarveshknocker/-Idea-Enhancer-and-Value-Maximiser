# Evidence grading

| Grade | Meaning | Examples | Use for |
|---|---|---|---|
| **A** | Primary, verifiable, rigorous | Peer-reviewed study, official statistics, audited financials, public API data you queried, a repository you inspected | Market size anchors, core technical claims, regulatory facts |
| **B** | Reputable secondary or strong convergence | Reputable journalism, established industry reports, ≥ 3 independent practitioner accounts saying the same thing, highly-starred and actively maintained repo | Pain validation, competitor landscape, trend claims |
| **C** | Single credible but unverified | One Reddit/X thread, a vendor's own marketing claim, a single blog post | Hypotheses to test, colour, quotes of sentiment |
| **D** | Speculative | Your own inference, forecasts without method, anonymous claims | Must be labelled "assumption" and put into the validation plan |

## Signals of quality for OSINT sources
- **GitHub**: stars *and* recent commits (pushed within ~12 months), open vs closed issues, license (MIT/Apache-2.0 = reusable commercially; GPL/AGPL = obligations; no license = not reusable), archived flag.
- **Reddit / HN / X**: engagement (score/points/comments), whether multiple unrelated people report the same pain, recency, the poster's apparent role (practitioner vs vendor).
- **Papers**: venue, citations (OpenAlex), year, whether results were replicated, open-access availability.
- **Datasets/models**: downloads/likes, license, documentation, update date, known biases.

## Red flags
- A number repeated everywhere but traceable to one old source.
- Vendor-sponsored "research".
- Survivorship bias (only success stories).
- Very old data for fast-moving markets.
- Engagement farming on X.

## Citation format in outputs
`claim — [source title](url) (grade B, 2025)`. If a claim combines several sources, list them all.
