---
name: enhance-value
description: Value maximisation for an idea — monetization models, pricing and premium packaging, bottom-up market sizing, unit economics, moats and go-to-market wedge — plus a transparent weighted scorer that ranks candidate enhancements. Use to make a concept premium and highly monetizable, or to compare ideas objectively.
---

# Maximise value

## 1. Who pays, for what, how much
Use `references/monetization-models.md`. For the top candidates decide:
- **Payer** (may differ from user: employer, insurer, brand, government, marketplace seller)
- **Value metric** (what the price scales with: shipments, seats, transactions, outcomes, GB, devices)
- **Model** (subscription, usage, take-rate, outcome fee, licensing, hardware + service, sponsorship…)
- **Packaging**: Free / Pro / Business / Enterprise tiers. The premium tier must contain the enhancements with the highest willingness-to-pay (automation, insights, integrations, compliance, guarantees, priority support, white-label).
- **Price anchors**: competitor prices from LANDSCAPE, cost of the current workaround, % of value created (typically capture 10–30 %).

## 2. Market sizing: bottom-up (`references/market-sizing.md`)
`reachable customers × adoption rate × annual price`, with every input sourced or labelled as an assumption. Show TAM → SAM → SOM (3-year). No top-down "1 % of a $50B market" reasoning.

## 3. Unit economics sketch
CAC (by channel), ARPU/ACV, gross margin (include AI/API/hardware costs), payback period, LTV:CAC. Flag if LTV:CAC < 3 or payback > 18 months.

## 4. Moat (`references/moats.md`)
Which moat compounds with usage? Proprietary data, network effects, switching costs, brand/trust, distribution partnerships, regulatory licenses, cost advantage, community. Design at least one into v1.

## 5. Score and rank
Write `.enhancer/ideas.json`:
```json
[{ "id": "E1", "name": "Shared cold-room booking via WhatsApp",
   "scores": { "impact": 5, "willingnessToPay": 4, "market": 4, "defensibility": 3, "simplicity": 5,
               "timeToValue": 5, "feasibility": 4, "evidence": 4, "risk": 4 },
   "notes": "evidence: LANDSCAPE §3 pain theme #1 (B)" }]
```
Scores 1–5 (risk: 5 = low risk; simplicity: 5 = very simple). Justify each score in `notes` with evidence references. Then:
```bash
node <kit>/skills/enhance-value/scripts/score.mjs .enhancer/ideas.json
```
→ `.enhancer/RANKING.md` with value (0–100), tier (Premium bet / Strong / Promising / Park) and gates (weak evidence, unclear WTP, too complex, high risk).

## 6. Synthesise the premium concept
Combine the top-ranked enhancements into **one coherent offer**: a simple free core that solves the main pain, plus premium layers that compound value (data, automation, network). Each element must reinforce the others. Write its value proposition as: *For [segment] who [pain], [name] is a [category] that [key benefit]. Unlike [alternative], it [differentiator].*
