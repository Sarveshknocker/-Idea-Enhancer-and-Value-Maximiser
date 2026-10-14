#!/usr/bin/env node
// Demand & "why now" signals: is interest in this problem/solution growing? (zero dependencies, Node >= 18)
//
//   node trends.mjs "<topic>" [--years 6] [--wiki "Article title"] [--out .enhancer] [--json]
//
// Yearly series from free, keyless public APIs:
//   wikipedia  monthly pageviews of the closest English article (public interest)
//   hn         Hacker News stories mentioning the topic (builder/early-adopter attention)
//   github     new repositories matching the topic (builder activity)
//   stackoverflow  new questions (practitioner pain)
//   openalex   research papers (scientific momentum)
// Reports each series, its growth over the last 3 complete years (CAGR) and a direction. These are proxies; treat them as
// evidence grade C and combine them with direct evidence (willingness to pay, interviews).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const UA = 'idea-enhancer (+https://github.com/Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser)';
const API = {
  wikiSearch: () => process.env.IE_WIKI_API ?? 'https://en.wikipedia.org/w/api.php',
  pageviews: () => process.env.IE_PAGEVIEWS_API ?? 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user',
  hn: () => process.env.IE_HN_API ?? 'https://hn.algolia.com/api/v1',
  github: () => process.env.IE_GITHUB_API ?? 'https://api.github.com',
  stack: () => process.env.IE_STACK_API ?? 'https://api.stackexchange.com/2.3',
  openalex: () => process.env.IE_OPENALEX_API ?? 'https://api.openalex.org',
};
async function getJSON(url, headers = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) });
    if (r.ok) return r.json();
    // GitHub search allows ~10 unauthenticated requests a minute: wait for the window once instead of failing.
    const reset = Number(r.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
    if (attempt === 0 && (r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0' && reset > 0 && reset < 70000) { await new Promise((ok) => setTimeout(ok, reset + 1000)); continue; }
    throw new Error(`HTTP ${r.status}${r.status === 403 ? ' (rate limit: set GITHUB_TOKEN)' : ''}`);
  }
}
const enc = encodeURIComponent;
/** Multi-word topics are searched as exact phrases where the API supports it. */
const phrase = (t) => (/\s/.test(t.trim()) && !/"/.test(t) ? `"${t.trim()}"` : t.trim());
/** Whole-site totals for past years never change: cache them. */
async function cachedTotal(key, fn) {
  const file = path.resolve(process.env.IE_CACHE ?? '.enhancer/cache', 'totals.json');
  let all = {}; try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (all[key]) return all[key];
  const v = await fn();
  if (v) { all[key] = v; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(all)); }
  return v;
}

export const SOURCES = {
  wikipedia: {
    label: 'Wikipedia pageviews (public interest)',
    async series(topic, years, opts) {
      let title = opts.wiki;
      if (!title) {
        const s = await getJSON(`${API.wikiSearch()}?action=opensearch&search=${enc(topic)}&limit=1&namespace=0&format=json`);
        title = s?.[1]?.[0];
        if (!title) throw new Error('no matching article');
      }
      const end = new Date().getUTCFullYear() - 1;
      const j = await getJSON(`${API.pageviews()}/${enc(title.replace(/ /g, '_'))}/monthly/${end - years + 1}010100/${end}123100`);
      const byYear = {};
      for (const it of j.items ?? []) { const y = Number(String(it.timestamp).slice(0, 4)); byYear[y] = (byYear[y] ?? 0) + it.views; }
      return { series: byYear, note: `article "${title}"` };
    },
  },
  hn: {
    label: 'Hacker News stories',
    async series(topic, years) {
      const out = {}; const end = new Date().getUTCFullYear() - 1;
      for (let y = end - years + 1; y <= end; y++) {
        const a = Date.UTC(y, 0, 1) / 1000; const b = Date.UTC(y + 1, 0, 1) / 1000;
        const j = await getJSON(`${API.hn()}/search?query=${enc(topic)}&tags=story&hitsPerPage=0&numericFilters=created_at_i>=${a},created_at_i<${b}`);
        out[y] = j.nbHits ?? 0;
      }
      return { series: out };
    },
  },
  github: {
    label: 'New GitHub repositories', normalised: 'share of all new repositories',
    async series(topic, years) {
      const out = {}; const share = {}; const end = new Date().getUTCFullYear() - 1;
      const h = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
      for (let y = end - years + 1; y <= end; y++) {
        const range = `created:${y}-01-01..${y}-12-31`;
        const j = await getJSON(`${API.github()}/search/repositories?q=${enc(`${phrase(topic)} ${range}`)}&per_page=1`, h);
        const all = await cachedTotal(`github-${y}`, () => getJSON(`${API.github()}/search/repositories?q=${enc(range)}&per_page=1`, h).then((t) => t.total_count));
        out[y] = j.total_count ?? 0; share[y] = all ? out[y] / all : null;
      }
      return { series: out, share };
    },
  },
  stackoverflow: {
    label: 'New Stack Overflow questions', normalised: 'share of all new questions',
    async series(topic, years) {
      const out = {}; const share = {}; const end = new Date().getUTCFullYear() - 1;
      for (let y = end - years + 1; y <= end; y++) {
        const range = `fromdate=${Date.UTC(y, 0, 1) / 1000}&todate=${Date.UTC(y + 1, 0, 1) / 1000 - 1}`;
        const j = await getJSON(`${API.stack()}/search/advanced?q=${enc(topic)}&site=stackoverflow&${range}&filter=total`);
        // Stack Overflow's overall volume fell sharply after 2022: compare the topic's share, not raw counts.
        const all = await cachedTotal(`stackoverflow-${y}`, () => getJSON(`${API.stack()}/questions?site=stackoverflow&${range}&filter=total`).then((t) => t.total));
        out[y] = j.total ?? 0; share[y] = all ? out[y] / all : null;
      }
      return { series: out, share };
    },
  },
  openalex: {
    label: 'Research papers (OpenAlex)',
    async series(topic, years) {
      const end = new Date().getUTCFullYear() - 1;
      const j = await getJSON(`${API.openalex()}/works?search=${enc(phrase(topic))}&filter=publication_year:${end - years + 1}-${end}&group_by=publication_year${process.env.OPENALEX_MAILTO ? `&mailto=${enc(process.env.OPENALEX_MAILTO)}` : ''}`);
      const out = {}; for (let y = end - years + 1; y <= end; y++) out[y] = 0;
      for (const g of j.group_by ?? []) out[Number(g.key)] = g.count;
      return { series: out };
    },
  },
};

/** Compound annual growth over the last `span` years of a {year: value} series. */
export function cagr(series, span = 3) {
  const ys = Object.keys(series).map(Number).sort();
  if (ys.length < span + 1) return null;
  const last = series[ys[ys.length - 1]]; const first = series[ys[ys.length - 1 - span]];
  if (!first || !last) return first === 0 && last > 0 ? Infinity : null;
  return Math.pow(last / first, 1 / span) - 1;
}
export const direction = (g) => (g === null ? 'not enough data' : g === Infinity ? 'emerging (from zero)' : g >= 0.25 ? 'surging' : g >= 0.08 ? 'growing' : g > -0.08 ? 'flat' : g > -0.25 ? 'declining' : 'collapsing');
export function sparkline(values) {
  const bars = '▁▂▃▄▅▆▇█'; const max = Math.max(...values); const min = Math.min(...values);
  return values.map((v) => bars[max === min ? 3 : Math.round(((v - min) / (max - min)) * 7)]).join('');
}

export async function trends(topic, { years = 6, sources = Object.keys(SOURCES), wiki } = {}) {
  const results = await Promise.all(sources.map(async (s) => {
    try {
      const r = await SOURCES[s].series(topic, years, { wiki });
      const basis = r.share && Object.values(r.share).every((v) => v !== null) ? r.share : r.series;
      const g = cagr(basis);
      return { source: s, label: SOURCES[s].label, basis: basis === r.share ? SOURCES[s].normalised : 'raw count', ...r, cagr3: g, direction: direction(g) };
    }
    catch (e) { return { source: s, label: SOURCES[s].label, error: e.message }; }
  }));
  const ok = results.filter((r) => !r.error && r.cagr3 !== null);
  const up = ok.filter((r) => r.cagr3 >= 0.08).length; const down = ok.filter((r) => r.cagr3 <= -0.08).length;
  const verdict = !ok.length ? 'no usable signal' : up >= Math.ceil(ok.length / 2) && up > down ? 'rising interest' : down > up ? 'fading interest' : 'mixed / stable';
  return { topic, generatedAt: new Date().toISOString(), years, results, verdict };
}

export function toMarkdown(r) {
  const years = [...new Set(r.results.flatMap((x) => Object.keys(x.series ?? {})))].sort();
  return `# Demand & "why now" signals: ${r.topic}

_Generated ${r.generatedAt.slice(0, 10)} from public APIs. Complete calendar years only. Proxies for interest, not demand: evidence grade C._

**Overall: ${r.verdict}.**

| Signal | ${years.join(' | ')} | Trend | 3-yr growth | Growth basis | Direction |
|---|${years.map(() => '---').join('|')}|---|---|---|---|
${r.results.map((x) => x.error ? `| ${x.label} | ${years.map(() => '').join(' | ')} | — | — | — | unavailable (${x.error}) |` : `| ${x.label}${x.note ? ` (${x.note})` : ''} | ${years.map((y) => (x.series[y] ?? 0).toLocaleString('en-US')).join(' | ')} | ${sparkline(years.map((y) => x.series[y] ?? 0))} | ${x.cagr3 === null ? '—' : x.cagr3 === Infinity ? 'new' : `${(x.cagr3 * 100).toFixed(0)}%/yr`} | ${x.basis} | ${x.direction} |`).join('\n')}

How to use it: rising builder activity (GitHub, HN) with flat public interest often means an early, technical market;
rising public interest with little builder activity can mean an underserved opportunity. A single spike is news, not a trend.
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const flag = (n, d) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const json = args.includes('--json'); if (json) args.splice(args.indexOf('--json'), 1);
  const years = Math.max(4, Math.min(10, Number(flag('years', 6)))); const wiki = flag('wiki'); const out = flag('out', '.enhancer');
  const sources = flag('sources', Object.keys(SOURCES).join(',')).split(',').filter(Boolean);
  const bad = sources.filter((s) => !SOURCES[s]);
  const topic = args.join(' ').trim();
  if (!topic || bad.length) { console.error(`usage: trends.mjs "<topic>" [--years 6] [--wiki "Article"] [--sources ${Object.keys(SOURCES).join(',')}]${bad.length ? `\nunknown: ${bad.join(', ')}` : ''}`); process.exit(2); }
  const r = await trends(topic, { years, sources, wiki });
  if (json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.results) console.log(x.error ? `✖ ${x.label}: ${x.error}` : `${sparkline(Object.values(x.series))}  ${x.label}${x.note ? ` (${x.note})` : ''}: ${x.direction}${x.cagr3 !== null && x.cagr3 !== Infinity ? ` (${(x.cagr3 * 100).toFixed(0)}%/yr)` : ''}`);
    console.log(`Overall: ${r.verdict}`);
    fs.mkdirSync(out, { recursive: true });
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
    fs.writeFileSync(path.join(out, `TRENDS-${slug}.md`), toMarkdown(r));
    console.log(`→ ${path.join(out, `TRENDS-${slug}.md`)}`);
  }
}
