#!/usr/bin/env node
// Business maths for idea validation — every result shows its formula (zero dependencies).
//
//   node economics.mjs unit       --price 29 --gross-margin 0.8 --churn 0.03 --cac 150        LTV, LTV:CAC, payback
//   node economics.mjs size       --buyers 120000 --price 348 --reachable 0.3 --share 0.05    bottom-up TAM / SAM / SOM
//   node economics.mjs vw         --csv pricing-survey.csv                                     Van Westendorp price range
//   node economics.mjs pmf        --very 42 --somewhat 35 --not 23                             Sean Ellis PMF test
//   node economics.mjs experiment --baseline 0.02 --target 0.04 [--traffic-per-day 500]       A/B visitors per arm
//   node economics.mjs experiment --expected 0.06 --threshold 0.03                             smoke test: visitors needed
//
// Benchmarks used in verdicts are common heuristics, not laws: LTV:CAC ≥ 3, CAC payback ≤ 12 months (SaaS),
// PMF ≥ 40% "very disappointed" (Sean Ellis). State them as such in any report.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => `$${Math.round(x).toLocaleString('en-US')}`;
const need = (o, keys, cmd) => { const miss = keys.filter((k) => typeof o[k] !== 'number' || Number.isNaN(o[k])); if (miss.length) throw new Error(`${cmd} needs ${miss.map((k) => `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`).join(' ')}`); };

/** z for a two-sided confidence level / one-sided power (Acklam approximation). */
export function z(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) return -z(1 - p);
  const q = p - 0.5; const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function unit(o) {
  need(o, ['price', 'grossMargin', 'churn', 'cac'], 'unit');
  if (o.churn <= 0 || o.churn >= 1) throw new Error('--churn is the monthly churn rate, between 0 and 1 (e.g. 0.03)');
  const marginPerMonth = o.price * o.grossMargin;
  const lifetimeMonths = 1 / o.churn; const ltv = marginPerMonth * lifetimeMonths; const ratio = ltv / o.cac; const payback = o.cac / marginPerMonth;
  return {
    ltv: r2(ltv), ltvToCac: r2(ratio), paybackMonths: r2(payback), lifetimeMonths: r2(lifetimeMonths),
    formula: 'LTV = price × gross margin ÷ monthly churn; payback = CAC ÷ (price × gross margin)',
    verdict: ratio >= 3 && payback <= 12 ? 'healthy by common SaaS heuristics (LTV:CAC ≥ 3, payback ≤ 12 months)' : ratio < 1 ? 'loses money on every customer: fix price, churn or acquisition cost before scaling' : 'marginal: improve retention, price or acquisition cost before scaling',
  };
}

export function size(o) {
  need(o, ['buyers', 'price'], 'size');
  const reachable = o.reachable ?? 1; const share = o.share ?? 0.01;
  const tam = o.buyers * o.price; const sam = tam * reachable; const som = sam * share;
  return { tam: Math.round(tam), sam: Math.round(sam), som: Math.round(som), customersAtSom: Math.round(o.buyers * reachable * share), formula: 'TAM = buyers × annual price; SAM = TAM × reachable share; SOM = SAM × achievable share', note: 'Bottom-up only: every input needs a cited source or an "assumption" label.' };
}

/** Van Westendorp price sensitivity meter from survey rows {tooCheap, cheap, expensive, tooExpensive}. */
export function vanWestendorp(rows) {
  const valid = rows.filter((r) => [r.tooCheap, r.cheap, r.expensive, r.tooExpensive].every((v) => Number.isFinite(v) && v >= 0) && r.tooCheap <= r.cheap && r.cheap <= r.expensive && r.expensive <= r.tooExpensive);
  if (valid.length < 20) throw new Error(`need at least 20 consistent answers (too cheap ≤ cheap ≤ expensive ≤ too expensive); got ${valid.length}`);
  const n = valid.length;
  const grid = [...new Set(valid.flatMap((r) => [r.tooCheap, r.cheap, r.expensive, r.tooExpensive]))].sort((a, b) => a - b);
  const share = (f) => grid.map((p) => valid.filter((r) => f(r, p)).length / n);
  const curves = {
    tooCheap: share((r, p) => r.tooCheap >= p), cheap: share((r, p) => r.cheap >= p),
    expensive: share((r, p) => r.expensive <= p), tooExpensive: share((r, p) => r.tooExpensive <= p),
  };
  curves.notCheap = curves.cheap.map((v) => 1 - v); curves.notExpensive = curves.expensive.map((v) => 1 - v);
  const cross = (a, b) => {
    for (let i = 0; i < grid.length - 1; i++) {
      const d0 = a[i] - b[i]; const d1 = a[i + 1] - b[i + 1];
      if (d0 === 0) return grid[i];
      if (Math.sign(d0) !== Math.sign(d1)) return r2(grid[i] + ((grid[i + 1] - grid[i]) * d0) / (d0 - d1));
    }
    return null;
  };
  const pmc = cross(curves.tooCheap, curves.notCheap); const pme = cross(curves.tooExpensive, curves.notExpensive);
  const opp = cross(curves.tooCheap, curves.tooExpensive); const ipp = cross(curves.cheap, curves.expensive);
  return { respondents: n, dropped: rows.length - n, pointOfMarginalCheapness: pmc, optimalPricePoint: opp, indifferencePricePoint: ipp, pointOfMarginalExpensiveness: pme,
    acceptableRange: pmc !== null && pme !== null ? [pmc, pme] : null,
    formula: 'PMC = too cheap ∩ not cheap; OPP = too cheap ∩ too expensive; IPP = cheap ∩ expensive; PME = too expensive ∩ not expensive',
    note: 'Stated, not revealed, willingness to pay: confirm with a real pricing test (pre-orders, paid pilot).' };
}

/** Wilson score interval for a proportion. */
export function wilson(k, n, conf = 0.95) {
  const zz = z(1 - (1 - conf) / 2); const p = k / n;
  const den = 1 + (zz * zz) / n; const centre = (p + (zz * zz) / (2 * n)) / den; const half = (zz * Math.sqrt((p * (1 - p)) / n + (zz * zz) / (4 * n * n))) / den;
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return [r3(Math.max(0, centre - half)), r3(Math.min(1, centre + half))];
}

export function pmf(o) {
  need(o, ['very', 'somewhat', 'not'], 'pmf');
  const n = o.very + o.somewhat + o.not;
  if (n < 1) throw new Error('no answers');
  const share = o.very / n; const ci = wilson(o.very, n);
  return { respondents: n, veryDisappointed: r2(share), ci95: ci, verdict: ci[0] >= 0.4 ? 'product-market fit signal (≥ 40% very disappointed, even at the low end of the interval)' : share >= 0.4 ? 'borderline: above 40% but the interval reaches below it; ask more of the right users' : 'not yet: find the segment that is most disappointed and build for them', note: n < 40 ? 'Fewer than 40 answers: the interval is wide. Survey only people who used the product recently (at least twice).' : 'Survey only active users.' };
}

export function experiment(o) {
  const alpha = o.alpha ?? 0.05; const power = o.power ?? 0.8;
  if (typeof o.baseline === 'number' && typeof o.target === 'number') {
    const p0 = o.baseline; const p1 = o.target; const pbar = (p0 + p1) / 2;
    const n = Math.ceil((z(1 - alpha / 2) * Math.sqrt(2 * pbar * (1 - pbar)) + z(power) * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / ((p1 - p0) ** 2));
    return { type: 'A/B', perArm: n, total: 2 * n, days: o.trafficPerDay ? Math.ceil((2 * n) / o.trafficPerDay) : null, formula: 'two-proportion z-test sample size', note: 'Decide the stopping rule before starting; do not stop when it first looks significant.' };
  }
  if (typeof o.expected === 'number' && typeof o.threshold === 'number') {
    if (o.expected <= o.threshold) throw new Error('--expected must be above --threshold');
    const zz = z(1 - alpha / 2);
    const n = Math.ceil((zz * zz * o.expected * (1 - o.expected)) / ((o.expected - o.threshold) ** 2));
    return { type: 'smoke test', visitors: n, days: o.trafficPerDay ? Math.ceil(n / o.trafficPerDay) : null, formula: 'n so the 95% interval around the expected rate stays above the threshold', note: 'Count only visitors from the target segment; a fake-door test must say honestly that the product is coming.' };
  }
  throw new Error('experiment needs --baseline and --target (A/B), or --expected and --threshold (smoke test)');
}

function parseCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n').filter((l) => l.trim());
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
  const col = (names) => head.findIndex((h) => names.includes(h));
  const idx = { tooCheap: col(['toocheap']), cheap: col(['cheap', 'bargain', 'goodvalue']), expensive: col(['expensive', 'gettingexpensive']), tooExpensive: col(['tooexpensive']) };
  if (Object.values(idx).some((i) => i < 0)) throw new Error('CSV needs columns: too_cheap, cheap, expensive, too_expensive');
  return lines.slice(1).map((l) => { const c = l.split(',').map((x) => Number(x.replace(/[^\d.]/g, ''))); return Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, c[i]])); });
}

// Run as a CLI? Compare real paths: macOS temp dirs are symlinks (/var → /private/var), Windows has 8.3 short names.
const realPath = (p) => { try { return realpathSync.native(p); } catch { return path.resolve(p); } };
if (process.argv[1] && realPath(process.argv[1]).toLowerCase() === realPath(fileURLToPath(import.meta.url)).toLowerCase()) {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) { const k = rest[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); const v = rest[i + 1]; o[k] = v !== undefined && !v.startsWith('--') ? (isNaN(Number(v)) ? v : Number(v)) : true; }
  const json = o.json === true;
  try {
    let res;
    if (cmd === 'unit') res = unit(o);
    else if (cmd === 'size') res = size(o);
    else if (cmd === 'vw') { if (!o.csv) throw new Error('vw needs --csv file'); res = vanWestendorp(parseCsv(o.csv)); }
    else if (cmd === 'pmf') res = pmf(o);
    else if (cmd === 'experiment') res = experiment(o);
    else { console.error('usage: economics.mjs <unit|size|vw|pmf|experiment> [--options]  (see header)'); process.exit(2); }
    if (json) console.log(JSON.stringify(res, null, 2));
    else for (const [k, v] of Object.entries(res)) console.log(`${k.padEnd(28)} ${Array.isArray(v) ? v.join(' – ') : typeof v === 'number' && /^(tam|sam|som|ltv)$/i.test(k) ? money(v) : v}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
