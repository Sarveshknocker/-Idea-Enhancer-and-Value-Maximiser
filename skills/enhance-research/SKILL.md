---
name: enhance-research
description: Open-source intelligence (OSINT) research for any idea or problem — GitHub, Hacker News, Reddit, arXiv, OpenAlex, Stack Overflow, Hugging Face, Wikipedia via a zero-dependency collector, plus web search for X/Twitter, patents, Product Hunt, app stores, competitor pricing, open-data portals and specialist sites. Produces a graded evidence landscape. Use whenever an idea needs market, technical or research grounding.
---

# OSINT research

## 1. Craft queries (the most important step)
APIs match keywords, not sentences. Write 4–8 **short** queries (2–4 words each):
- **Problem terms**: "cold chain spoilage", "invoice reconciliation"
- **Solution terms**: "temperature logger lora", "ocr invoice matching"
- **Open building blocks**: "<x> open source", "<x> dataset", "<x> api"
- **Adjacent/analogous domains** (from the connect step): "vaccine cold chain", "food traceability"
- **Market words**: "<x> pricing", "<x> startup", "<x> alternative"
Put them in `.enhancer/queries.txt` (one per line).

## 2. Run the collector
```bash
node <kit>/skills/enhance-research/scripts/research.mjs --queries-file .enhancer/queries.txt --limit 8 --tag landscape
# single query:
node <kit>/skills/enhance-research/scripts/research.mjs "cold chain iot" --sources github,hn,arxiv --limit 10
```
- Default sources: `github, hn, reddit, arxiv, openalex, stackoverflow, huggingface, wikipedia`. Opt-in: `npm` (software ideas), `hf-datasets`, `news` (GDELT, rate-limited).
- The collector automatically broadens queries (full → keywords → shorter) and drops irrelevant results (`relevance` field). `signal` = popularity (log scale) + freshness, weighted by relevance.
- Output: `.enhancer/research/<tag>.md` (readable) and `.json` (full).
- Optional env: `GITHUB_TOKEN` (higher rate limit), `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` (free Reddit "script" app; anonymous Reddit API access is blocked), `OPENALEX_MAILTO`.
- If Node or network is unavailable, do the same searches with your web tool.

## 3. Web search for everything without a free API
Use your tool's web search/browse capability (never log in, never bypass paywalls or robots rules):
| Source | How |
|---|---|
| **X / Twitter** | `site:x.com "<topic>"`, `site:twitter.com <topic> launch`. Look for founders, practitioners, launches, complaints |
| **Reddit** (if collector blocked) | `site:reddit.com <topic> "anyone use"`, `… "alternative to"`, `… "hate"`: the richest source of real pain |
| **Patents** | `site:patents.google.com <topic>`: prior art, what big players protect |
| **Product Hunt / app stores** | `site:producthunt.com <topic>`, Play Store / App Store listings and 1–3★ reviews |
| **Competitors & pricing** | "<topic> pricing", "<competitor> vs", G2/Capterra categories |
| **Open data** | data.gov, data.gov.in, data.europa.eu, World Bank, FAO, WHO, Kaggle, Our World in Data |
| **Research & reports** | Google Scholar, Semantic Scholar, industry associations, government reports |
| **Specialist communities** | Discourse forums, Discord/Slack public archives, trade publications, niche blogs |
| **Funding signals** | "<topic> raises seed", Crunchbase news, YC company directory |

## 4. Grade the evidence (`references/evidence-grading.md`)
A = primary data / peer-reviewed / official stats · B = reputable secondary / many independent confirmations · C = single credible anecdote / vendor claim · D = speculation / unverified. Big decisions need A or B.

## 5. Write `.enhancer/LANDSCAPE.md`
1. **Existing solutions** (table: name, type, pricing, strengths, weaknesses, link)
2. **Reusable building blocks** (open-source repos with stars/license/last activity, APIs, datasets, models)
3. **What users say** (pain themes, summarised in your own words with source links; note frequency)
4. **Research frontier** (papers/breakthroughs that make something newly possible or cheaper)
5. **Signals & trends** (funding, launches, regulation, cost curves)
6. **White space**: needs nobody serves well → these seed the enhancements
7. **Sources** with grades
