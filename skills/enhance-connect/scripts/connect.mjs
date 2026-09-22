#!/usr/bin/env node
// Cross-domain connection engine: generates seeded "bridges" between the problem and distant fields,
// business mechanisms, enabling technologies and inventive principles. Provocations, not answers.
// Usage: node connect.mjs "<problem or idea>" [count=8] [--json]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fields that have solved analogous problems at scale — borrow their proven playbooks.
export const DOMAINS = [
  ['biology / immune system', 'detect-and-respond, redundancy, self-repair'],
  ['ant colonies / swarms', 'decentralised coordination with simple local rules'],
  ['epidemiology', 'spread models, contact tracing, herd thresholds'],
  ['air-traffic control', 'real-time scheduling of scarce shared resources'],
  ['aviation safety', 'checklists, blameless incident reporting, redundancy'],
  ['Formula 1 pit stops', 'choreographed speed, telemetry, specialised roles'],
  ['hospital triage', 'prioritise by severity under scarcity'],
  ['logistics / last-mile delivery', 'routing, batching, hubs and spokes'],
  ['stock exchanges', 'price discovery, matching engines, liquidity'],
  ['insurance', 'pooling risk, pricing uncertainty, parametric payouts'],
  ['micro-finance / chit funds', 'group trust as collateral'],
  ['video games', 'progression, feedback loops, onboarding by play'],
  ['social media', 'network effects, creator economies, feeds'],
  ['open-source communities', 'volunteer contribution at scale, governance'],
  ['Wikipedia', 'crowd-maintained knowledge with light moderation'],
  ['restaurants / cloud kitchens', 'shared infrastructure, many brands'],
  ['hotels / Airbnb', 'monetising idle capacity, trust via reviews'],
  ['ride-hailing', 'dynamic matching and surge pricing'],
  ['libraries', 'access over ownership, sharing expensive assets'],
  ['Toyota production system', 'just-in-time, kanban, poka-yoke (mistake-proofing)'],
  ['military logistics', 'pre-positioning, standardised kits, command posts'],
  ['space missions', 'extreme reliability, simulation before execution'],
  ['agriculture cooperatives', 'aggregation for bargaining power'],
  ['credit bureaus', 'reputation as a portable asset'],
  ['app stores', 'platform + third-party ecosystem + revenue share'],
  ['telecom prepaid', 'tiny top-ups for low-income users'],
  ['UPI / instant payments', 'interoperable rails, zero-cost transactions'],
  ['music streaming', 'all-you-can-eat subscription, royalties by usage'],
  ['fitness wearables', 'passive sensing, streaks, social accountability'],
  ['education / MOOCs', 'cohorts, certification, spaced repetition'],
  ['weather forecasting', 'sensor networks + models + public alerts'],
  ['recycling / circular economy', 'reverse logistics, deposit-return'],
  ['franchising', 'replicable playbook with local owners'],
  ['religious & community institutions', 'rituals, belonging, volunteer networks'],
  ['sports leagues', 'rankings, seasons, fandom, broadcast rights'],
  ['museums', 'curation and storytelling of complexity'],
  ['emergency services (112/911)', 'single entry point, dispatch, SLAs'],
  ['open data / government APIs', 'public infrastructure others build on'],
  ['scientific peer review', 'distributed verification of claims'],
  ['cooking recipes', 'standardised steps any novice can follow'],
];

export const MECHANISMS = [
  'two-sided marketplace', 'subscription with usage tiers', 'freemium → premium upgrade', 'pay-per-outcome / success fee',
  'community-led growth', 'data network effect (product improves with every user)', 'embedded finance (payments, credit, insurance)',
  'B2B2C distribution through an existing channel', 'certification / trust badge', 'API platform others build on',
  'bundling complements', 'unbundling one painful step', 'hardware-enabled service (device + recurring data)', 'white-label for enterprises',
  'aggregator of fragmented supply', 'reverse auction / demand pooling', 'gamified participation', 'referral loops',
  'open-core (free open source + paid hosted/enterprise)', 'sponsorship / public-good funding', 'licensing IP or datasets', 'managed service (done-for-you)',
];

export const ENABLERS = [
  'LLM agents that do the work end to end', 'on-device / edge AI', 'computer vision from a phone camera', 'speech & vernacular voice interfaces',
  'WhatsApp / Telegram bots (zero install)', 'cheap IoT sensors + LoRa/NB-IoT', 'satellite & drone imagery', 'digital twins & simulation',
  'no-code / low-code workflows', 'open datasets & public APIs', 'real-time payments (UPI, Pix, FedNow)', 'QR codes & NFC',
  'federated / privacy-preserving computation', 'retrieval over private documents', 'robotic process automation', '3D printing / local fabrication',
  'digital identity & e-KYC', 'mesh / offline-first sync', 'recommendation engines', 'synthetic data',
];

// Inventive principles (paraphrased from TRIZ-style systematic innovation).
export const PRINCIPLES = [
  ['Segmentation', 'split the system into independent, swappable parts'],
  ['Taking out', 'remove the troublesome part; keep only what users value'],
  ['Local quality', 'make each part optimal for its own context instead of one-size-fits-all'],
  ['Asymmetry', 'treat segments differently (pricing, UX, capacity)'],
  ['Merging', 'combine parallel operations or products into one'],
  ['Universality', 'let one element do several jobs'],
  ['Nesting', 'place one system inside another (embed where users already are)'],
  ['Prior action', 'do the work before it is needed (pre-compute, pre-position)'],
  ['Cushion in advance', 'build in fallbacks for predictable failures'],
  ['Inversion', 'do the opposite: let customers do it, move it later, make it free'],
  ['Dynamics', 'make fixed things adjustable in real time'],
  ['Partial or excessive action', 'do slightly less (or more) when 100% is too hard'],
  ['Another dimension', 'move to a new axis: time, space, social, data'],
  ['Periodic action', 'replace continuous effort with bursts or schedules'],
  ['Continuity of useful action', 'eliminate idle time and empty runs'],
  ['Skipping', 'go through the risky phase very fast'],
  ['Blessing in disguise', 'turn a harmful factor (waste, complaints, noise) into value'],
  ['Feedback', 'measure and adapt automatically'],
  ['Intermediary', 'use a temporary middle layer (broker, agent, escrow)'],
  ['Self-service', 'the system serves and maintains itself'],
  ['Copying', 'use a cheap copy/simulation instead of the real thing'],
  ['Cheap short-living objects', 'replace an expensive durable with many cheap disposables'],
  ['Parameter change', 'change state, concentration, flexibility, or frequency'],
  ['Composite', 'combine different materials, skills or data sources'],
];

function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Returns `count` bridges. Deterministic per problem text; no domain repeats within one run. */
export function bridges(problem, count = 8) {
  const rand = rng(hash(problem.trim().toLowerCase()));
  const pickUnique = (arr, used) => { let i; do { i = Math.floor(rand() * arr.length); } while (used.has(i) && used.size < arr.length); used.add(i); return arr[i]; };
  const usedD = new Set(), usedM = new Set(), usedE = new Set(), usedP = new Set();
  return Array.from({ length: Math.max(1, Math.min(count, DOMAINS.length)) }, (_, n) => {
    if (usedM.size >= MECHANISMS.length) usedM.clear();
    if (usedE.size >= ENABLERS.length) usedE.clear();
    if (usedP.size >= PRINCIPLES.length) usedP.clear();
    const [domain, lesson] = pickUnique(DOMAINS, usedD);
    const mechanism = pickUnique(MECHANISMS, usedM);
    const enabler = pickUnique(ENABLERS, usedE);
    const [principle, meaning] = pickUnique(PRINCIPLES, usedP);
    return {
      id: `B${n + 1}`, domain, lesson, mechanism, enabler, principle, principleMeaning: meaning,
      prompt: `How has ${domain} solved a problem shaped like this (${lesson})? Apply "${principle}" (${meaning}), deliver it via ${enabler}, and capture value through ${mechanism}.`,
    };
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const pos = args.filter((a) => !a.startsWith('--'));
  const problem = pos[0];
  if (!problem) { console.error('Usage: node connect.mjs "<problem or idea>" [count=8] [--json]'); process.exit(2); }
  const list = bridges(problem, Number(pos[1] ?? 8));
  if (json) console.log(JSON.stringify(list, null, 2));
  else {
    console.log(`Cross-domain bridges for: "${problem}"\nTreat each as a provocation: keep what fits the evidence, drop the rest.\n`);
    for (const b of list) console.log(`${b.id}. ${b.domain}  ×  ${b.principle}  ×  ${b.enabler}  →  ${b.mechanism}\n    ${b.prompt}\n`);
  }
}
