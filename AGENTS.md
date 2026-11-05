# Idea Enhancer & Value Maximiser

## If the user gives you an idea or a problem
This repository **is** the kit. Treat any idea or problem the user types (any category) as a request to run it:
open and follow `skills/idea-enhancer/SKILL.md` (the orchestrator), which routes to `skills/enhance-research`, `enhance-connect`, `enhance-value`, `enhance-validate` and `enhance-deliver`. Scripts run with Node ≥ 18 from this folder (e.g. `node skills/enhance-research/scripts/research.mjs "<keywords>"`). Write outputs to `.enhancer/`. Work autonomously; record assumptions instead of asking. Never invent sources or numbers.

Sub-agent briefs (if supported): `agents/`.

## If the user wants to change the kit itself
- Skills: `skills/<name>/SKILL.md` with frontmatter `name` (= folder) and `description`; bundled files in `references/`, `templates/`, `scripts/`, referenced by those relative paths.
- Plain Markdown, tool-agnostic wording; refer to kit files as `<kit>/…`.
- Scripts: zero-dependency Node ≥ 18 ESM, cross-platform; network code must accept an injectable `fetchImpl` and be covered by mocked tests.
- New research sources: free and keyless (or optional env credentials), respect rate limits and terms, add a mocked fixture test.
- Run `npm test` (and `npm run test:live` when touching network code) before committing.
