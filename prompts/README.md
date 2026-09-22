# Ready-to-paste prompts

Agentic tools read the kit automatically (open this repo, or run `init` in your folder). For **chat-only AIs** (ChatGPT, Gemini web, Claude.ai), attach `skills/enhance/SKILL.md` plus the sub-skill files and, ideally, a research file you generated with `node bin/enhancer.mjs research "<keywords>"`.

---

### 1. Full enhancement (autonomous)
```
Enhance this idea with the Idea Enhancer: <your idea or problem>.
Research what exists (GitHub, Reddit, X, papers, open data), connect it with other domains,
make it premium and monetizable but simple, stress-test it and give me the Value Blueprint.
```

### 2. Solve a problem (no idea yet)
```
Use the Idea Enhancer to solve this problem as simply and effectively as possible: <problem>.
Find how other fields solved similar problems, what open-source tools and datasets exist,
and give me the 3 best solution concepts ranked by value, then a full blueprint for the winner.
```

### 3. Make an existing product premium
```
Using the Idea Enhancer, analyse <product / URL / description>. Find the highest-value enhancements
and a premium tier people would pay for. Include pricing, packaging and a 90-day roadmap.
```

### 4. Quick mode (10 minutes)
```
Idea Enhancer quick mode for: <idea>. Do a light research pass (top sources only), 12 enhancements,
top 3 with pricing, and the single cheapest experiment to validate it this week.
```

### 5. Chat-only AI
```
You are the Idea Enhancer (attached SKILL.md files). My idea: <idea>. Attached is an OSINT research file.
Where you need more evidence, tell me exactly which searches to run and I will paste results.
Never invent sources or numbers; label assumptions. Deliver the Value Blueprint at the end.
```
