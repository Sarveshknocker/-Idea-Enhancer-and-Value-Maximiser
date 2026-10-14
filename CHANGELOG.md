# Changelog

## 0.2.0 — 2026-10-15
Upgrade informed by leading open-source product/marketing skills and established validation methods
(see `research/BENCHMARK.md`).

### Added
- **`voice.mjs`**: voice-of-customer mining from Hacker News comments, GitHub issues and Stack Overflow: pains, wishes,
  workarounds, price objections and switching stories with links; per-repository cap, duplicate removal, template and
  entity cleaning, themes counted per post, concentration warning.
- **`trends.mjs`**: yearly interest signals (Wikipedia pageviews, HN stories, new GitHub repositories, Stack Overflow
  questions, OpenAlex papers) with 3-year growth; GitHub and Stack Overflow growth normalised by site totals; phrase
  search; cached totals; rate-limit wait.
- **`economics.mjs`**: unit economics (LTV, LTV:CAC, payback), bottom-up TAM/SAM/SOM, Van Westendorp price range,
  Sean Ellis PMF score with Wilson interval, A/B and smoke-test sample sizes.
- **Ranking robustness** in `score.mjs`: share of ±30% weightings in which each idea wins; close calls flagged.
- Interview and honest fake-door guidance; rationalizations, red flags, definition of done; evals; Codex manifests;
  CLI commands `voice`, `trends`, `economics`.
- Tests for every new tool (mock servers, textbook values, guards).

## 0.1.0
- Initial release: framing, OSINT collector, cross-domain connection engine, value scorer, validation, blueprint, installer.
