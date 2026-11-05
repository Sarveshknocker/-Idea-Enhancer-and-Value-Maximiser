// Tests for Idea Enhancer. Network calls are mocked (deterministic, offline). Pass --live (or LIVE=1) to also hit real APIs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { research, keywords, queryLadder, relevance, signal, toMarkdown, SOURCES, DEFAULT_SOURCES } from '../skills/enhance-research/scripts/research.mjs';
import { bridges, DOMAINS } from '../skills/enhance-connect/scripts/connect.mjs';
import { rank, scoreIdea, WEIGHTS } from '../skills/enhance-value/scripts/score.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(KIT, 'bin', 'enhancer.mjs');
const node = (args, opts = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', ...opts });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'enhancer-'));

// ---------------------------------------------------------------- mock network
const recent = new Date(Date.now() - 30 * 864e5).toISOString();
const FIXTURES = {
  'api.github.com': { items: [
    { full_name: 'acme/cold-chain-iot', html_url: 'https://github.com/acme/cold-chain-iot', description: 'Cold chain temperature monitoring with LoRa sensors', stargazers_count: 1200, forks_count: 80, open_issues_count: 5, pushed_at: recent, language: 'C++', topics: ['iot', 'cold-chain'], license: { spdx_id: 'MIT' } },
    { full_name: 'x/unrelated', html_url: 'https://github.com/x/unrelated', description: 'A CSS framework', stargazers_count: 90000, pushed_at: recent, topics: [] },
  ] },
  'hn.algolia.com': { hits: [{ objectID: '1', title: 'Show HN: Cold chain monitoring for farmers', url: 'https://example.org', points: 250, num_comments: 90, created_at: recent }] },
  'export.arxiv.org': `<feed><entry><id>http://arxiv.org/abs/1234.5678</id><published>${recent}</published><title>Low-cost cold chain monitoring</title><summary>We study temperature excursions in cold chain logistics.</summary><category term="cs.NI"/></entry></feed>`,
  'api.openalex.org': { results: [{ display_name: 'Cold chain losses in developing countries', doi: 'https://doi.org/10.1/abc', cited_by_count: 340, publication_date: '2021-05-01', primary_location: { source: { display_name: 'Food Policy' } }, open_access: { is_oa: true }, type: 'article' }] },
  'api.stackexchange.com': { items: [{ title: 'Reading cold chain temperature sensor over LoRa', link: 'https://stackoverflow.com/q/1', score: 12, answer_count: 2, view_count: 3000, creation_date: 1700000000, tags: ['lora', 'arduino'], is_answered: true }] },
  'huggingface.co': [{ id: 'org/cold-chain-forecaster', downloads: 5000, likes: 12, pipeline_tag: 'time-series-forecasting', lastModified: recent }],
  'en.wikipedia.org': { query: { search: [{ title: 'Cold chain', snippet: 'A <span>cold chain</span> is a temperature-controlled supply chain', timestamp: recent, wordcount: 3000 }] } },
};
const calls = [];
function mockFetch(url) {
  calls.push(String(url));
  const host = new URL(url).host;
  if (host === 'www.reddit.com') return Promise.resolve(new Response('blocked', { status: 403 }));
  // GitHub only answers the short query (simulates keyword-strict APIs).
  if (host === 'api.github.com' && /small|farmers/.test(decodeURIComponent(url))) return Promise.resolve(Response.json({ items: [] }));
  const body = FIXTURES[host];
  if (body === undefined) return Promise.resolve(new Response('not found', { status: 404 }));
  return Promise.resolve(typeof body === 'string' ? new Response(body, { status: 200 }) : Response.json(body));
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('keywords drop stopwords; ladder broadens the query', () => {
  assert.deepEqual(keywords('How can we build a cold chain monitoring tool for small farmers?'), ['cold', 'chain', 'monitoring', 'farmers']);
  assert.deepEqual(queryLadder('cold chain monitoring for small farmers'), ['cold chain monitoring for small farmers', 'cold chain monitoring farmers', 'cold chain monitoring', 'cold chain']);
});

test('research normalises every default source, walks the ladder and filters irrelevant items', async () => {
  calls.length = 0;
  const run = await research('cold chain monitoring for small farmers', { fetchImpl: mockFetch, limit: 5 });
  const by = Object.groupBy ? Object.groupBy(run.items, (i) => i.source) : run.items.reduce((a, i) => ((a[i.source] ??= []).push(i), a), {});
  for (const s of ['github', 'hn', 'arxiv', 'openalex', 'stackoverflow', 'huggingface', 'wikipedia']) assert.ok(by[s]?.length, `no items from ${s}`);
  const gh = by.github;
  assert.equal(gh.length, 1, 'off-topic CSS framework must be filtered by relevance');
  assert.equal(gh[0].matchedQuery, 'cold chain monitoring', 'github should succeed on a shorter ladder step');
  assert.equal(gh[0].extra.license, 'MIT');
  assert.ok(run.items.every((i) => i.url && i.title && typeof i.signal === 'number' && i.relevance > 0));
  assert.deepEqual(run.errors.map((e) => e.source), ['reddit']);
  assert.match(run.errors[0].error, /REDDIT_CLIENT_ID/);
  assert.equal(calls.filter((u) => u.includes('reddit.com')).length, 1, '403 must not be retried');
  const md = toMarkdown([run]);
  assert.match(md, /Unavailable sources: reddit/);
  assert.match(md, /\[acme\/cold-chain-iot\]\(https:\/\/github\.com\/acme\/cold-chain-iot\)/);
});

test('unknown source is rejected; signal favours popular + fresh', async () => {
  await assert.rejects(research('x', { sources: ['myspace'], fetchImpl: mockFetch }), /Unknown source/);
  const fresh = signal({ metrics: { stars: 1000 }, date: recent });
  const old = signal({ metrics: { stars: 1000 }, date: '2012-01-01' });
  const tiny = signal({ metrics: { stars: 2 }, date: recent });
  assert.ok(fresh > old && fresh > tiny && fresh <= 100);
  assert.ok(DEFAULT_SOURCES.every((s) => SOURCES[s]));
});

test('relevance is keyword share over title/summary/topics', () => {
  assert.equal(relevance({ title: 'Cold chain', summary: 'monitoring for farmers' }, 'cold chain monitoring farmers'), 1);
  assert.equal(relevance({ title: 'CSS framework' }, 'cold chain monitoring farmers'), 0);
});

test('connect: deterministic per problem, varied across problems, unique domains', () => {
  const a = bridges('reduce food waste in hostels', 10), b = bridges('reduce food waste in hostels', 10), c = bridges('help freelancers get paid on time', 10);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((x) => x.domain), c.map((x) => x.domain));
  assert.equal(new Set(a.map((x) => x.domain)).size, 10);
  assert.ok(a.every((x) => x.prompt.includes(x.domain) && x.mechanism && x.enabler && x.principle));
  assert.equal(bridges('x', 999).length, DOMAINS.length);
});

const idea = (id, s) => ({ id, name: id, scores: { impact: s, willingnessToPay: s, market: s, defensibility: s, simplicity: s, timeToValue: s, feasibility: s, evidence: s, risk: s } });
test('score: weights sum, ranking, tiers and gates', () => {
  assert.equal(scoreIdea(idea('max', 5)).value, 100);
  assert.equal(scoreIdea(idea('min', 1)).value, 20);
  const weak = { ...idea('weak-evidence', 5), scores: { ...idea('x', 5).scores, evidence: 1, simplicity: 2 } };
  const r = rank([idea('mid', 3), weak, idea('top', 5)]);
  assert.deepEqual(r.map((x) => x.id), ['top', 'weak-evidence', 'mid']);
  assert.equal(r[0].tier, 'Premium bet');
  assert.ok(r[1].gates.some((g) => /evidence/.test(g)) && r[1].gates.some((g) => /complex/.test(g)));
  assert.throws(() => scoreIdea({ id: 'bad', scores: { impact: 9 } }), /missing\/invalid/);
  assert.ok(Object.values(WEIGHTS).every((w) => w > 0));
});

test('CLI: score writes RANKING.md; connect prints bridges; research validates args', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'ideas.json'), JSON.stringify([idea('A', 4), idea('B', 2)]));
  let r = node([CLI, 'score', path.join(dir, 'ideas.json'), '--out', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'RANKING.md'), 'utf8'), /\| 1 \| A \|/);
  r = node([CLI, 'connect', 'late payments for freelancers', '3']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal((r.stdout.match(/^B\d\./gm) ?? []).length, 3);
  r = node([CLI, 'research']);
  assert.equal(r.status, 2);
});

test('init → update → remove round-trip keeps user content intact', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Notes\nKeep this.\n');
  let r = node([CLI, 'init', dir]);
  assert.equal(r.status, 0, r.stderr);
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Keep this\./);
  assert.match(agents, /\.enhancer-kit\/skills\/idea-enhancer\/SKILL\.md/);
  for (const f of ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md', '.cursor/rules/idea-enhancer.mdc', '.windsurf/rules/idea-enhancer.md', '.clinerules/idea-enhancer.md', '.claude/skills/idea-enhancer/SKILL.md', '.claude/agents/enhancer-osint-researcher.md', '.enhancer-kit/skills/enhance-research/scripts/research.mjs']) {
    assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}`);
  }
  r = node([CLI, 'update', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal((fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').match(/idea-enhancer:start/g) ?? []).length, 1);
  r = node([CLI, 'remove', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Notes\nKeep this.\n');
  assert.ok(!fs.existsSync(path.join(dir, '.enhancer-kit')) && !fs.existsSync(path.join(dir, 'CLAUDE.md')));
});

test('installed scripts run from the target project', () => {
  const dir = tmp();
  node([CLI, 'init', dir, '--tools', 'agents']);
  const r = node([path.join(dir, '.enhancer-kit/skills/enhance-connect/scripts/connect.mjs'), 'water scarcity in apartments', '2', '--json']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).length, 2);
});

test('every skill has valid frontmatter and referenced files exist', () => {
  for (const s of fs.readdirSync(path.join(KIT, 'skills'))) {
    const md = fs.readFileSync(path.join(KIT, 'skills', s, 'SKILL.md'), 'utf8');
    const fm = md.match(/^---\nname: ([\w-]+)\ndescription: (.+)\n---/);
    assert.ok(fm, `${s}: bad frontmatter`);
    assert.equal(fm[1], s);
    for (const ref of md.matchAll(/`((?:references|templates|scripts)\/[\w./-]+\.\w+)`/g)) {
      assert.ok(fs.existsSync(path.join(KIT, 'skills', s, ref[1])), `${s}: missing ${ref[1]}`);
    }
  }
});

// ---------------------------------------------------------------- v0.2: demand evidence, economics, robustness
const T = await import('../skills/enhance-research/scripts/trends.mjs');
const V = await import('../skills/enhance-research/scripts/voice.mjs');
const E = await import('../skills/enhance-value/scripts/economics.mjs');
const { robustness } = await import('../skills/enhance-value/scripts/score.mjs');
const http = await import('node:http');
const { spawn } = await import('node:child_process');
const nodeAsync = (args, opts = {}) => new Promise((resolve) => {
  const c = spawn(process.execPath, args, { cwd: opts.cwd, env: { ...process.env, ...(opts.env ?? {}) } });
  let stdout = ''; let stderr = '';
  c.stdout.on('data', (d) => { stdout += d; }); c.stderr.on('data', (d) => { stderr += d; });
  c.on('close', (status) => resolve({ status, stdout, stderr }));
});

test('trends: CAGR, direction labels, sparkline', () => {
  assert.equal(Math.round(T.cagr({ 2020: 100, 2021: 1, 2022: 1, 2023: 800 }) * 100), 100, '100 → 800 over 3 years = +100%/yr');
  assert.equal(T.cagr({ 2022: 0, 2023: 0, 2024: 0, 2025: 5 }), Infinity);
  assert.equal(T.cagr({ 2024: 1, 2025: 2 }), null);
  assert.deepEqual([0.3, 0.1, 0, -0.1, -0.5, null, Infinity].map(T.direction), ['surging', 'growing', 'flat', 'declining', 'collapsing', 'not enough data', 'emerging (from zero)']);
  assert.equal(T.sparkline([1, 2, 3, 8]), '▁▂▃█');
});

test('trends CLI: five sources, Stack Overflow/GitHub growth normalised by site totals, phrase search', async () => {
  const end = new Date().getUTCFullYear() - 1; const seen = [];
  const yearOf = (u) => { const m = u.match(/(20\d\d)-01-01/) ?? u.match(/fromdate=(\d+)/); return m[1].length === 4 ? Number(m[1]) : new Date(Number(m[1]) * 1000).getUTCFullYear(); };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url); seen.push(u);
    const json = (o) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u.startsWith('/wiki?')) return json(['x', ['Vector database']]);
    if (u.startsWith('/pv/')) return json({ items: Array.from({ length: 4 }, (_, i) => ({ timestamp: `${end - 3 + i}010100`, views: 100 * 2 ** i })) });
    if (u.startsWith('/hn/')) { const y = new Date(Number(u.match(/created_at_i>=(\d+)/)[1]) * 1000).getUTCFullYear(); return json({ nbHits: y - (end - 6) }); }
    if (u.startsWith('/gh/')) { const y = yearOf(u); return json({ total_count: u.includes('"vector database"') ? 10 * (y - end + 6) : 1e6 }); }
    if (u.startsWith('/se/questions')) { const y = yearOf(u); return json({ total: 1e6 / 2 ** (y - end + 6) }); } // the whole site halves every year
    if (u.startsWith('/se/search')) { const y = yearOf(u); return json({ total: 1000 / 2 ** (y - end + 6) * 1.5 ** (y - end + 6) }); } // topic falls slower than the site
    if (u.startsWith('/oa/')) return json({ group_by: [{ key: String(end), count: 50 }, { key: String(end - 3), count: 50 }] });
    res.writeHead(404); res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const b = `http://127.0.0.1:${server.address().port}`;
  const dir = tmp();
  const env = { IE_WIKI_API: `${b}/wiki`, IE_PAGEVIEWS_API: `${b}/pv`, IE_HN_API: `${b}/hn`, IE_GITHUB_API: `${b}/gh`, IE_STACK_API: `${b}/se`, IE_OPENALEX_API: `${b}/oa`, IE_CACHE: path.join(dir, 'cache') };
  try {
    const r = await nodeAsync([path.join(KIT, 'skills/enhance-research/scripts/trends.mjs'), 'vector database', '--json'], { env });
    assert.equal(r.status, 0, r.stderr);
    const res = JSON.parse(r.stdout); const by = Object.fromEntries(res.results.map((x) => [x.source, x]));
    assert.equal(by.wikipedia.note, 'article "Vector database"'); assert.equal(by.wikipedia.direction, 'surging');
    assert.equal(by.stackoverflow.basis, 'share of all new questions');
    assert.ok(by.stackoverflow.series[end] < by.stackoverflow.series[end - 3], 'raw count falls');
    assert.equal(by.stackoverflow.direction, 'surging', 'but its share of a shrinking site grows 50%/yr');
    assert.equal(by.openalex.direction, 'flat');
    assert.ok(seen.some((u) => u.includes('"vector database"')), 'multi-word topic searched as a phrase');
    assert.equal(res.verdict, 'rising interest');
    const again = await nodeAsync([path.join(KIT, 'skills/enhance-research/scripts/trends.mjs'), 'vector database', '--json', '--sources', 'stackoverflow'], { env });
    assert.equal(again.status, 0);
    assert.equal(seen.filter((u) => u.startsWith('/se/questions')).length, 6, 'site totals for past years are cached');
  } finally { server.close(); }
});

test('voice: signal tagging, per-post themes, group cap, dedupe, entity decoding, concentration warning', () => {
  const doc = (url, text, group, weight = 1) => ({ source: 'GitHub issue', url, text, group, weight });
  const docs = [
    ...Array.from({ length: 6 }, (_, i) => doc(`https://g/spam/${i}`, `Problem ${i}: freelancers can't reconcile invoices manually every month, it is tedious.`, 'repo/spam', 5)),
    doc('https://hn/1', 'I hate manually entering data into spreadsheets for invoices, it is so tedious and slow.', undefined),
    doc('https://hn/2', 'We switched from QuickBooks to a spreadsheet because the subscription was too expensive per month.', undefined),
    doc('https://hn/3', 'Is there any tool that does this without manually entering data? I would pay for it.', undefined),
    doc('https://hn/4', 'Is there any tool that does this without manually entering data? I would pay for it.', undefined),
  ];
  const kept = V.capGroups(docs);
  assert.equal(kept.filter((d) => d.group === 'repo/spam').length, 3, 'max 3 posts per repository');
  assert.equal(kept.filter((d) => d.url.startsWith('https://hn/3') || d.url.startsWith('https://hn/4')).length, 1, 'exact duplicates dropped');
  const r = V.extract(kept, 'invoices');
  assert.ok(r.counts.pain > 0 && r.counts.wish > 0 && r.counts.workaround > 0 && r.counts.price > 0 && r.counts.switching > 0, JSON.stringify(r.counts));
  const theme = r.themes.find((t) => t.theme === 'manually entering');
  assert.ok(theme && theme.posts === 2, `themes count distinct posts: ${JSON.stringify(r.themes.slice(0, 5))}`);
  assert.ok(!r.themes.some((t) => /invoices/.test(t.theme)), 'query words are not themes');
  assert.ok(r.hits.every((h) => h.excerpt.split(/\s+/).length <= 26), 'excerpts are short');
  assert.equal(V.clean('**Pain / stakes:** It&#x27;s frustrating that exports break &#x2F; fail every week. https://spam.example/x'), "It's frustrating that exports break / fail every week.");
});

test('economics: unit economics, bottom-up size, PMF interval, experiment sizes match the formulas', () => {
  const u = E.unit({ price: 29, grossMargin: 0.8, churn: 0.03, cac: 150 });
  assert.equal(u.ltv, 773.33); assert.equal(u.ltvToCac, 5.16); assert.equal(u.paybackMonths, 6.47); assert.match(u.verdict, /healthy/);
  assert.match(E.unit({ price: 10, grossMargin: 0.5, churn: 0.2, cac: 100 }).verdict, /loses money/);
  assert.throws(() => E.unit({ price: 1, grossMargin: 1, churn: 3, cac: 1 }), /monthly churn/);
  const s = E.size({ buyers: 120000, price: 348, reachable: 0.3, share: 0.05 });
  assert.deepEqual([s.tam, s.sam, s.som, s.customersAtSom], [41760000, 12528000, 626400, 1800]);
  const p = E.pmf({ very: 42, somewhat: 35, not: 23 });
  assert.deepEqual(p.ci95, [0.328, 0.518]); assert.match(p.verdict, /borderline/);
  assert.match(E.pmf({ very: 300, somewhat: 100, not: 100 }).verdict, /product-market fit signal/);
  assert.equal(E.experiment({ baseline: 0.02, target: 0.04 }).perArm, 1141);
  assert.equal(E.experiment({ expected: 0.06, threshold: 0.03, trafficPerDay: 100 }).visitors, 241);
  assert.throws(() => E.experiment({}), /needs/);
  assert.ok(Math.abs(E.z(0.975) - 1.959964) < 1e-5);
});

test('economics: Van Westendorp finds the textbook crossing points and rejects inconsistent answers', () => {
  // Respondents spread evenly; each answers 0.5× / 1× / 1.6× / 2.4× of a personal reference price 8..16.
  const rows = Array.from({ length: 81 }, (_, i) => { const b = 8 + i * 0.1; return { tooCheap: b * 0.5, cheap: b, expensive: b * 1.6, tooExpensive: b * 2.4 }; });
  const vw = E.vanWestendorp([...rows, { tooCheap: 9, cheap: 5, expensive: 6, tooExpensive: 7 }]);
  assert.equal(vw.respondents, 81); assert.equal(vw.dropped, 1);
  assert.ok(vw.pointOfMarginalCheapness < vw.optimalPricePoint || vw.optimalPricePoint < vw.indifferencePricePoint);
  assert.ok(vw.acceptableRange[0] < vw.indifferencePricePoint && vw.indifferencePricePoint < vw.acceptableRange[1]);
  assert.ok(Math.abs(vw.indifferencePricePoint - 15.1) < 0.6, `IPP ${vw.indifferencePricePoint}: where 'cheap' and 'expensive' shares cross`);
  assert.throws(() => E.vanWestendorp(rows.slice(0, 10)), /at least 20/);
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 's.csv'), 'Too cheap,Cheap,Expensive,Too expensive\n' + rows.map((r) => [r.tooCheap, r.cheap, r.expensive, r.tooExpensive].join(',')).join('\n'));
  const x = node([CLI, 'economics', 'vw', '--csv', path.join(dir, 's.csv'), '--json']);
  assert.equal(x.status, 0, x.stderr); assert.equal(JSON.parse(x.stdout).respondents, 81);
});

test('score robustness: a dominant idea wins every weighting; near-ties split; RANKING.md reports it', () => {
  const mk = (id, v, over = {}) => ({ id, name: id, scores: { ...Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, v])), ...over } });
  const dom = robustness([mk('A', 5), mk('B', 3), mk('C', 2)]);
  assert.equal(dom.A, 1);
  const split = robustness([mk('A', 4, { market: 5, timeToValue: 3 }), mk('B', 4, { market: 3, timeToValue: 5 })]);
  assert.ok(split.A > 0.2 && split.B > 0.2, JSON.stringify(split));
  assert.deepEqual(robustness([mk('A', 4, { market: 5, timeToValue: 3 }), mk('B', 4, { market: 3, timeToValue: 5 })]), split, 'seeded: reproducible');
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'ideas.json'), JSON.stringify([mk('A', 4, { market: 5, timeToValue: 3 }), mk('B', 4, { market: 3, timeToValue: 5 })]));
  const r = node([CLI, 'score', path.join(dir, 'ideas.json'), '--out', dir]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(dir, 'RANKING.md'), 'utf8'), /## Robustness[\s\S]*Close call/);
});

test('evals well formed; plugin manifests agree with package.json; entry lists every skill; orchestrator routes to all', () => {
  const e = JSON.parse(fs.readFileSync(path.join(KIT, 'evals/cases.json'), 'utf8'));
  const ids = new Set();
  for (const c of e.cases) { assert.ok(c.id && !ids.has(c.id)); ids.add(c.id); assert.ok(c.prompt && c.graders.length >= 2 && c.expected, c.id); }
  assert.ok(e.cases.some((c) => c.kind === 'negative'));
  const pkg = JSON.parse(fs.readFileSync(path.join(KIT, 'package.json'), 'utf8'));
  const claude = JSON.parse(fs.readFileSync(path.join(KIT, '.claude-plugin/plugin.json'), 'utf8'));
  const codex = JSON.parse(fs.readFileSync(path.join(KIT, '.codex-plugin/plugin.json'), 'utf8'));
  assert.equal(codex.name, claude.name); assert.equal(claude.version, pkg.version); assert.equal(codex.version, pkg.version);
  const entry = fs.readFileSync(path.join(KIT, 'adapters/entry.md'), 'utf8');
  const orch = fs.readFileSync(path.join(KIT, 'skills/idea-enhancer/SKILL.md'), 'utf8');
  for (const s of fs.readdirSync(path.join(KIT, 'skills'))) { assert.ok(entry.includes(`skills/${s}/SKILL.md`), `entry.md misses ${s}`); if (s !== 'idea-enhancer') assert.ok(orch.includes(s), `orchestrator misses ${s}`); }
});

if (process.env.LIVE === '1' || process.argv.includes('--live')) {
  test('LIVE: real APIs return relevant results for a sample query', async () => {
    const run = await research('solar water pump', { sources: ['github', 'hn', 'arxiv', 'openalex', 'wikipedia'], limit: 3 });
    const ok = new Set(run.items.map((i) => i.source));
    assert.ok(ok.size >= 3, `only ${[...ok]} responded; errors: ${JSON.stringify(run.errors)}`);
  });
}

let failed = 0;
for (const t of tests) {
  try { await t.fn(); console.log(`✔ ${t.name}`); }
  catch (e) { failed++; console.log(`✖ ${t.name}\n   ${String(e.message).split('\n').slice(0, 8).join('\n   ')}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
