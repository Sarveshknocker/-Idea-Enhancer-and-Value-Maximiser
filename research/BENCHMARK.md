# Benchmark: what leading projects do, and what this kit took

Researched October 2026 from the most-starred open-source agent skills for product, marketing and research work, and
from established validation methods. Star counts are from the GitHub API at the time. Only ideas were taken; the code
here is original (see [CREDITS.md](../CREDITS.md)).

| Project / method | Stars | Licence | Best at | Taken into this kit |
|---|---|---|---|---|
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | ~55k | MIT | Customer research by mining public "watering holes" (forums, reviews, issues); pricing with value metrics and Van Westendorp; treating fetched text as untrusted | `voice.mjs` (mines pains, wishes, workarounds, prices, switching stories with links; untrusted-text warning); Van Westendorp in `economics.mjs` |
| [Imbad0202/academic-research-skills](https://github.com/Imbad0202/academic-research-skills) | ~52k | see repo | Research → review → revise loops with explicit evidence standards | Already reflected in the evidence grades; this release adds "show the computation" for every number |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | ~107k | MIT | Rationalizations, red flags, definition of done; negative eval cases | Same sections in the orchestrator; should-not-trigger eval |
| Sean Ellis product-market-fit survey | method | — | "How would you feel if you could no longer use…?" with a 40% "very disappointed" benchmark | `economics.mjs pmf` with a Wilson interval, so small samples are not over-read |
| Van Westendorp price sensitivity meter | method | — | Acceptable price range from four survey questions | `economics.mjs vw` with consistency filtering and interpolated crossings |
| Two-proportion power analysis | method | — | How many visitors an A/B or smoke test needs | `economics.mjs experiment` |

## Measured (live)
- `trends "vector database"`: Wikipedia pageviews 286 → 124,871, new GitHub repositories 3 → 3,720, papers 123 → 3,377 over
  2022–2025. Raw Stack Overflow questions fell, but as a share of a shrinking site they grew: without normalisation the
  tool would have reported "collapsing", which is wrong.
- `voice "invoice software freelancers"`: 162 posts after guards. Before the guards, one repository of templated issues
  supplied most of the signal; capping per repository, stripping template headings and counting themes per post turned
  noise ("offer tracks", "#x2f #x2f") into real themes ("manually entering data", "per month", "free tier").

## Not adopted, and why
- Persona "councils" of famous people: entertaining, but this kit's job is evidence; the `skeptic` agent already plays
  the dissenting role without simulating real individuals.
- Scraping review sites behind logins or against terms: only public APIs and normal web search are used.
