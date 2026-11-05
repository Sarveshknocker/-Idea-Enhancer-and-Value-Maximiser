#!/usr/bin/env node
// Value scorer: ranks candidate enhancements/concepts with a transparent weighted rubric.
// Input: JSON array (default .enhancer/ideas.json) of
//   { "id": "E1", "name": "...", "scores": { "impact": 1-5, "willingnessToPay": 1-5, "market": 1-5, "defensibility": 1-5,
//     "simplicity": 1-5, "timeToValue": 1-5, "feasibility": 1-5, "evidence": 1-5, "risk": 1-5 }, "notes": "..." }
//   (risk: 5 = LOW risk; simplicity: 5 = very simple to build and to use)
// Usage: node score.mjs [ideas.json] [--out .enhancer] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

export const WEIGHTS = {
  impact: 18,            // severity × frequency of the pain solved
  willingnessToPay: 16,  // evidence people/companies pay for this today
  market: 10,            // reachable buyers × price
  defensibility: 10,     // moat: data, network, brand, switching cost, IP
  simplicity: 14,        // simple to build AND simple to use — the core mission
  timeToValue: 10,       // how fast users feel the benefit
  feasibility: 8,        // team/tech/regulatory realism
  evidence: 8,           // strength of research backing (see evidence grades)
  risk: 6,               // 5 = low risk
};
const TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

export function scoreIdea(idea) {
  const s = idea.scores ?? {};
  const missing = Object.keys(WEIGHTS).filter((k) => typeof s[k] !== 'number' || s[k] < 1 || s[k] > 5);
  if (missing.length) throw new Error(`${idea.id ?? idea.name}: missing/invalid scores (1–5): ${missing.join(', ')}`);
  const value = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + s[k] * w, 0) / (5 * TOTAL) * 100;
  const gates = [];
  if (s.evidence <= 2) gates.push('weak evidence — validate before building');
  if (s.willingnessToPay <= 2) gates.push('unclear willingness to pay');
  if (s.simplicity <= 2) gates.push('too complex — simplify');
  if (s.risk <= 2) gates.push('high risk — mitigation plan required');
  const tier = value >= 80 ? 'Premium bet' : value >= 68 ? 'Strong' : value >= 55 ? 'Promising' : 'Park';
  return { ...idea, value: Math.round(value * 10) / 10, tier, gates };
}

export function rank(ideas) {
  return ideas.map(scoreIdea).sort((a, b) => b.value - a.value || b.scores.simplicity - a.scores.simplicity);
}

/**
 * How often each idea comes first when every weight is perturbed by up to ±30% (seeded, reproducible).
 * A winner that holds under most weightings is a robust choice; a split result means the ranking depends on taste.
 */
export function robustness(ideas, { iterations = 2000, spread = 0.3, seed = 42 } = {}) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const wins = new Map(ideas.map((i) => [i.id ?? i.name, 0]));
  for (let it = 0; it < iterations; it++) {
    const w = Object.fromEntries(Object.entries(WEIGHTS).map(([k, v]) => [k, v * (1 - spread + 2 * spread * rnd())]));
    let best = null; let bestV = -1;
    for (const idea of ideas) { const v = Object.entries(w).reduce((sum, [k, wk]) => sum + idea.scores[k] * wk, 0); if (v > bestV) { bestV = v; best = idea.id ?? idea.name; } }
    wins.set(best, wins.get(best) + 1);
  }
  return Object.fromEntries([...wins].map(([k, v]) => [k, Math.round((v / iterations) * 1000) / 1000]));
}

export function robustnessMarkdown(robust) {
  if (!robust) return '';
  const sorted = Object.entries(robust).sort((a, b) => b[1] - a[1]);
  const verdict = sorted[0][1] >= 0.7 ? 'The winner is robust to reasonable changes in priorities.' : 'Close call: the winner depends on how you weigh the criteria. Validate the top two ideas (see enhance-validate) before committing.';
  return `\n## Robustness\nShare of 2,000 random weightings (each weight ±30%) in which each idea ranks first: ${sorted.filter(([, v]) => v > 0).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ')}.\n${verdict}\n`;
}

export function toMarkdown(ranked, robust) {
  const cols = Object.keys(WEIGHTS);
  return `# Value ranking

Weights: ${cols.map((c) => `${c} ${WEIGHTS[c]}`).join(' · ')} (total ${TOTAL}). Scores 1–5; risk 5 = low risk.

| Rank | ID | Enhancement | Value | Tier | ${cols.map((c) => c.replace(/([A-Z])/g, ' $1').toLowerCase()).join(' | ')} | Gates |
|---|---|---|---|---|${cols.map(() => '---').join('|')}|---|
${ranked.map((r, i) => `| ${i + 1} | ${r.id ?? ''} | ${r.name} | **${r.value}** | ${r.tier} | ${cols.map((c) => r.scores[c]).join(' | ')} | ${r.gates.join('; ') || '✅'} |`).join('\n')}
${robustnessMarkdown(robust)}`;
}

// Run as a CLI? Compare real paths: macOS temp dirs are symlinks (/var → /private/var), Windows has 8.3 short names.
const realPath = (p) => { try { return realpathSync.native(p); } catch { return path.resolve(p); } };
if (process.argv[1] && realPath(process.argv[1]).toLowerCase() === realPath(fileURLToPath(import.meta.url)).toLowerCase()) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? '.enhancer/ideas.json';
  let ideas;
  try { ideas = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(2); }
  let ranked;
  try { ranked = rank(ideas); } catch (e) { console.error(e.message); process.exit(1); }
  if (args.includes('--json')) { console.log(JSON.stringify(ranked, null, 2)); process.exit(0); }
  const outDir = path.resolve(opt('--out', '.enhancer'));
  fs.mkdirSync(outDir, { recursive: true });
  const robust = ranked.length > 1 ? robustness(ranked) : null;
  fs.writeFileSync(path.join(outDir, 'RANKING.md'), toMarkdown(ranked, robust));
  for (const [i, r] of ranked.entries()) console.log(`${String(i + 1).padStart(2)}. ${String(r.value).padStart(5)}  ${r.tier.padEnd(12)} ${r.id ?? ''} ${r.name}${r.gates.length ? '  ⚠ ' + r.gates.join('; ') : ''}`);
  if (robust) console.log(`Robustness (wins under ±30% weights): ${Object.entries(robust).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ')}`);
  console.log(`→ ${path.relative(process.cwd(), path.join(outDir, 'RANKING.md'))}`);
}
