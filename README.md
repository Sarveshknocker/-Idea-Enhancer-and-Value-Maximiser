# Idea Enhancer & Value Maximiser

**Give it any idea or problem. It researches what already exists, connects fields nobody thought to connect, adds the most valuable enhancements, and returns a premium, monetizable concept that's still simple.**

Works with **Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Cline/Roo, Aider, Jules, Amp, Zed**, and chat-only AIs. Any category: tech, business, social impact, hardware, health, education, agriculture, creative, personal.

```
"idea or problem" ─► 1. Frame ─────► 2. Research ────────► 3. Connect ──────► 4. Maximise ────► 5. Stress-test ─► 6. Blueprint
                      real problem,    GitHub · Reddit · X     cross-domain       pricing, tiers,    pre-mortem,       VALUE_BLUEPRINT.md
                      who suffers,     HN · papers · patents   bridges, ≥12       market sizing,     legal & ethics,   before → after,
                      root cause       open data · pricing     enhancements,      moats, value       cheap experiments roadmap, sources
                                                               simplicity filter  scoring
```

## What makes it different
| Typical AI brainstorm | Idea Enhancer |
|---|---|
| Ideas from the model's memory | **Live open-source intelligence**: GitHub repos, Hacker News, Reddit, arXiv, OpenAlex, Stack Overflow, Hugging Face, Wikipedia via a built-in collector, plus X/Twitter, patents, Product Hunt, competitor pricing and open-data portals via web search |
| Obvious features | **Cross-domain bridges**: borrows proven playbooks from unrelated fields (air-traffic control, chit funds, immune systems, F1 pit stops…) × inventive principles × enabling tech × business mechanisms |
| Feature pile-ups | **Simplicity filter**: 5-minute value, 6-week ship, ≤ 3 core features. Complex problems solved simply |
| "You could charge a subscription" | **Value engineering**: payer, value metric, Free→Pro→Enterprise packaging, bottom-up TAM/SAM/SOM, unit economics, moats, transparent value scoring |
| Uncritical enthusiasm | **Red-team**: riskiest assumptions, pre-mortem, legal/regulatory/ethical check, experiments you can run this week |
| Made-up numbers | **Graded evidence** (A–D) with links for every claim; assumptions labelled |
| "People will love it" | **Demand evidence**: real pains, workarounds, price objections and switching stories mined from public discussions, plus multi-year interest trends normalised for platform growth |
| Back-of-envelope maths | **Computed**: unit economics, bottom-up market size, Van Westendorp price range, product-market-fit score with its interval, and experiment sample sizes |
| A ranking that hides its taste | **Robustness**: how often the top idea still wins when every weight moves ±30% |

## Use it

### Option A: open this repo directly
```bash
git clone https://github.com/Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser.git
```
Open the folder in your AI tool and type your idea or problem, e.g.:
> Enhance this idea: a WhatsApp bot that helps small farmers find cold storage.

### Option B: install into any project/folder
```bash
npx github:Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser init path/to/folder
```
This copies the kit to `.enhancer-kit/` and adds a short instruction section for every AI tool (`AGENTS.md`, `CLAUDE.md` + `.claude/skills`, `GEMINI.md`, Copilot, Cursor, Windsurf, Cline) without touching your existing text. Use `update` to refresh and `remove` to uninstall; your `.enhancer/` outputs are kept.

### Option C: Claude Code plugin
`/plugin marketplace add Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser` then `/plugin install idea-enhancer@idea-enhancer`.

It runs **autonomously** and writes everything to `.enhancer/`:

| File | Contents |
|---|---|
| `FRAME.md` | Real problem, segments, job-to-be-done, root causes, success metrics |
| `research/*.md/.json` | Raw OSINT evidence with popularity/freshness signals and relevance |
| `LANDSCAPE.md` | Competitors & pricing, reusable open source, datasets/APIs, user pain themes, research frontier, white space |
| `IDEAS.md` | ≥ 12 enhancements across 10 lenses, with the cross-domain bridges that inspired them |
| `ideas.json` → `RANKING.md` | Transparent value scores and tiers |
| `VALIDATION.md` | Assumption map, pre-mortem, risk checklist, experiment plan |
| **`VALUE_BLUEPRINT.md`** | The deliverable: before → after, simple core, premium enhancements, business model, 30/60/90 roadmap, sources |

More prompts: [prompts/README.md](prompts/README.md).

## CLI (usable without an AI too)
```bash
node bin/enhancer.mjs research "cold chain iot" --limit 10                  # OSINT collector
node bin/enhancer.mjs research --queries-file .enhancer/queries.txt --tag landscape
node bin/enhancer.mjs connect "late payments for freelancers" 10            # cross-domain bridges
node bin/enhancer.mjs score .enhancer/ideas.json                             # value ranking + robustness
node bin/enhancer.mjs voice "invoice software freelancers"                   # pains, wishes, workarounds, prices
node bin/enhancer.mjs trends "e-invoicing"                                   # interest over 6 years
node bin/enhancer.mjs economics unit --price 29 --gross-margin 0.8 --churn 0.03 --cac 150
node bin/enhancer.mjs economics experiment --expected 0.06 --threshold 0.03 # landing-page test size
```
Optional environment variables:
- `GITHUB_TOKEN`: higher GitHub rate limit.
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`: a free Reddit "script" app. Reddit blocks anonymous API access; without these, the AI covers Reddit through web search.
- `OPENALEX_MAILTO`: joins OpenAlex's "polite pool" for faster, more reliable responses.

## What's inside
```
skills/
  enhance/              orchestrator: autonomous 6-phase workflow, integrity rules, framing toolkit
  enhance-research/     OSINT playbook, evidence grading, collector (10+ sources), voice-of-customer miner, demand trends
  enhance-connect/      cross-domain bridge engine (40 domains × 24 principles × 20 enablers × 22 mechanisms), 10 enhancement lenses, simplicity filter
  enhance-value/        monetization models, pricing, market sizing, moats, value scorer + robustness, economics calculator
  enhance-validate/     pre-mortem, assumption map, legal/regulatory/ethics checklist, experiment design
  enhance-deliver/      Value Blueprint template + one-pager
agents/                 osint-researcher, cross-domain-inventor, value-strategist, skeptic
bin/enhancer.mjs        installer + CLI
evals/                  with-kit vs baseline cases judged blind
research/BENCHMARK.md   what we learned from leading open-source projects
tests/run.mjs           offline tests (mocked network) + optional live API test
```

## Limitations
- **Research quality depends on sources and the AI's web access.** Free APIs have rate limits, and some platforms (X, Reddit, patents) need web search or credentials. The blueprint lists which sources were unavailable.
- **Numbers in the blueprint are only as good as their sources.** Every figure is linked or labelled as an assumption. Validate the riskiest ones with the experiments it proposes before investing.
- **It helps you decide; it doesn't replace talking to customers.** The first experiment it recommends is usually exactly that.
- **Mined customer voice is a technical sample.** Hacker News, GitHub and Stack Overflow over-represent developers and early adopters; the trends are proxies for interest (evidence grade C), not proof that anyone will pay.
- **Responsible use.** It researches topics, markets and public projects, not private individuals, and flags harmful or non-compliant ideas.

## Credits
Ideas adapted from open-source projects and methods are listed in [CREDITS.md](CREDITS.md); the comparison is in [research/BENCHMARK.md](research/BENCHMARK.md).

## Related kits
- [3D-animated-web-developer](https://github.com/Sarveshknocker/3D-animated-web-developer): build a premium 3D/animated site for the concept.
- [The-protectors-](https://github.com/Sarveshknocker/The-protectors-): security-harden what you build.
- [The-Ai-Maker-](https://github.com/Sarveshknocker/The-Ai-Maker-): design the AI system behind the concept.
- [The-Hardware-engineering](https://github.com/Sarveshknocker/The-Hardware-engineering): design the device.
- [The-Reconstructor](https://github.com/Sarveshknocker/The-Reconstructor): understand an existing product's codebase.

## Develop
```bash
npm test            # offline
npm run test:live   # also hits the real APIs
```
License: MIT.
