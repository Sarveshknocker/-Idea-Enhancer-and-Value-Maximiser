---
name: enhance-validate
description: Red-team and validate an enhanced idea — riskiest assumptions, failure modes, competitor responses, legal/regulatory/ethical checks, and a fast, cheap experiment plan with success thresholds. Use before committing time or money to a concept, or when asked "will this work?".
---

# Stress-test & validate

Adopt the stance of a sceptical investor who has seen 1,000 pitches. Be specific and honest. The goal is to make the concept **survive**, not to kill it for fun.

## 1. Assumption map
List every assumption the concept depends on. For each: category (desirability / viability / feasibility / legality), evidence grade, and **impact if wrong** (1–5). The riskiest assumptions have high impact and weak evidence. Test those first.

## 2. Pre-mortem
"It's 18 months later and this failed. Why?" Write the 5 most likely reasons, e.g. users don't change habits, the payer isn't the user, CAC too high, incumbent copies it, regulation, key API/platform dependency, hardware logistics, trust. Add a mitigation for each, or change the concept.

## 3. Competitive response
What does the strongest incumbent do when you succeed? (copy, bundle for free, acquire, lobby). How does the moat hold?

## 4. Legal, regulatory, ethical (`references/risk-checklist.md`)
Data protection (GDPR, India DPDP, CCPA), sector rules (finance, health, food, drones, telecom, education, labour), IP/licensing of reused open source (GPL/AGPL obligations), platform terms (WhatsApp Business, app stores, API ToS), accessibility, safety, environmental impact, potential for misuse and harm to vulnerable users.

## 5. Validation plan (days, not months)
| # | Riskiest assumption | Experiment | Cost/time | Success threshold | Kill/pivot signal |
|---|---|---|---|---|---|
Experiment types: problem interviews (10–15 people), landing page + pricing test, concierge/Wizard-of-Oz MVP, pre-orders / paid pilot, fake-door feature test, partner LOIs, prototype usability test, data feasibility spike.

Size every quantitative experiment before running it, so the threshold means something:
```bash
node <kit>/skills/enhance-value/scripts/economics.mjs experiment --expected 0.06 --threshold 0.03 --traffic-per-day 300   # smoke test / landing page
node <kit>/skills/enhance-value/scripts/economics.mjs experiment --baseline 0.02 --target 0.04                         # A/B: visitors per arm
node <kit>/skills/enhance-value/scripts/economics.mjs pmf --very 42 --somewhat 35 --not 23                            # Sean Ellis PMF survey, with interval
```
**Interviews that tell the truth**: ask about what people did last time the problem happened (what they tried, what it cost them, what they paid for), not whether they would like your idea. Compliments and "I would use that" are not evidence; time, money or reputation they commit (a pilot, a pre-order, an introduction) is. Talk to the segment that feels the pain most, and write down the exact words they use.
Fake-door and smoke tests must be honest: say the product is coming, never take payment for something that does not exist without a clear refund and delivery promise.

## 6. Revise
Update the concept, ranking and roadmap with what the stress-test changed. Record the changes in `.enhancer/VALIDATION.md`.
