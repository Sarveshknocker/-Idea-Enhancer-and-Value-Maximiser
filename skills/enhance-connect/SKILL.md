---
name: enhance-connect
description: Creative engine that links unrelated domains, technologies, business mechanisms and inventive principles to generate the most creative, high-value enhancements for an idea — then filters them for simplicity. Use to generate breakthrough ideas, solve a problem in an unconventional way, or find unexpected connections.
---

# Connect & create

## 1. Cross-domain bridges
```bash
node <kit>/skills/enhance-connect/scripts/connect.mjs "<problem statement>" 10
```
Each bridge = **Domain** (a field that solved an analogous problem) × **Inventive principle** × **Enabling technology** × **Value mechanism**. Seeded by the problem text, so the same input gives the same bridges.
For each bridge, answer in one or two lines: *what would this look like for our problem?* Keep the ones that make sense given the LANDSCAPE evidence, discard the rest.

Also do **deliberate analogy search** without the script: "Who else has this problem at 100× the scale or stakes?" (militaries, airlines, hospitals, exchanges, nature), then research how they solved it.

## 2. Enhancement lenses (generate ≥ 12 candidates across at least 6 lenses)
| Lens | Questions |
|---|---|
| **Core product** | What's the 10× better version of the core job? What can be removed? |
| **Experience** | Zero-install (WhatsApp/web), voice, local language, offline, one-tap flows, delight moments |
| **Data & AI** | What data does usage create? What prediction/automation becomes possible? What gets better with every user? |
| **Distribution** | Which existing channel already reaches the users (partners, marketplaces, communities, institutions)? What's the viral/referral loop? |
| **Business model** | Who pays? Can someone else pay (sponsor, employer, insurer, government, brand)? Outcome-based pricing? |
| **Ecosystem** | Which open-source projects, APIs, datasets, communities can we plug into instead of building? Which partners gain from our success? |
| **Trust & safety** | What makes users trust it (certification, transparency, guarantees, escrow, reviews)? |
| **Impact & brand** | Social/environmental upside that attracts grants, CSR money, press, talent |
| **Platform** | Could others build on it (API, templates, marketplace)? |
| **Hardware / physical** | Would a cheap sensor, kiosk, printed QR, or local agent network unlock the digital solution? |

For each candidate write: `ID · name · what it is · who benefits · why valuable (evidence link) · what it reuses · effort (S/M/L)`.

## 3. Combination moves
- **Stack** two small enhancements that reinforce each other (e.g. data network effect + referral loop).
- **Invert** an assumption (free for users, paid by the party that benefits most).
- **Shift the unit** (sell outcomes, not software; per-shipment, not per-seat).
- **Borrow a proven playbook** from another industry wholesale (franchise model, chit-fund trust model, app-store ecosystem).

## 4. Simplicity filter (`references/simplicity.md`)
Every candidate must pass: *Can a user get value in under 5 minutes? Can a small team ship a first version in under 6 weeks? Does it remove steps rather than add them?* Rewrite or drop candidates that fail.

## 5. Output
`.enhancer/IDEAS.md` with all candidates, the bridges that inspired them, and which ones passed the simplicity filter.
