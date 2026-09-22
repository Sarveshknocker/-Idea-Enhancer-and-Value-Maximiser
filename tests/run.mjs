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
  assert.match(agents, /\.enhancer-kit\/skills\/enhance\/SKILL\.md/);
  for (const f of ['CLAUDE.md', 'GEMINI.md', '.github/copilot-instructions.md', '.cursor/rules/idea-enhancer.mdc', '.windsurf/rules/idea-enhancer.md', '.clinerules/idea-enhancer.md', '.claude/skills/enhance/SKILL.md', '.claude/agents/osint-researcher.md', '.enhancer-kit/skills/enhance-research/scripts/research.mjs']) {
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
