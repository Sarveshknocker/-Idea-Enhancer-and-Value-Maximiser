#!/usr/bin/env node
// Idea Enhancer installer — works for any AI coding tool.
//
//   node bin/enhancer.mjs init   [targetDir] [--tools all|claude,cursor,...] [--kit-dir .enhancer-kit] [--force]
//   node bin/enhancer.mjs update [targetDir]   (re-copies kit, refreshes instruction blocks)
//   node bin/enhancer.mjs remove [targetDir]   (removes only what the kit installed; leaves .enhancer/ outputs)
//   node bin/enhancer.mjs research|connect|score ... (proxies to the kit scripts)
//
// Or without cloning:  npx github:Sarveshknocker/-Idea-Enhancer-and-Value-Maximiser init
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { installerCommand } from './kit-installer.mjs';

const KIT_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = {
  id: 'idea-enhancer',
  name: 'Idea Enhancer',
  marker: 'idea-enhancer',
  kitDir: '.enhancer-kit',
  agentPrefix: 'enhancer',
  parts: ['skills', 'agents', 'adapters', 'README.md', 'LICENSE'],
  ruleFile: 'idea-enhancer',
  description: 'Idea Enhancer kit — use when the user shares an idea or problem to enhance, research, solve, validate or monetize',
  next: 'Next: open the project in your AI tool and say, e.g.\n  "Enhance this idea with the Idea Enhancer: <your idea or problem>"',
  kept: '.enhancer/ outputs',
  legacyPaths: {
    '.claude/agents/cross-domain-inventor.md': '.claude/agents/enhancer-cross-domain-inventor.md',
    '.claude/agents/osint-researcher.md': '.claude/agents/enhancer-osint-researcher.md',
    '.claude/agents/skeptic.md': '.claude/agents/enhancer-skeptic.md',
    '.claude/agents/value-strategist.md': '.claude/agents/enhancer-value-strategist.md',
    '.claude/skills/enhance': '.claude/skills/idea-enhancer',
  },
  kitSrc: KIT_SRC,
};

const [cmd = 'help', ...rest] = process.argv.slice(2);
const flag = (name, def) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : def; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));

if (installerCommand(KIT, cmd, rest)) process.exit(0);

function runScript(rel, args) {
  const r = spawnSync(process.execPath, [path.join(KIT_SRC, rel), ...args], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

switch (cmd) {
  case 'research': runScript('skills/enhance-research/scripts/research.mjs', rest); break;
  case 'connect': runScript('skills/enhance-connect/scripts/connect.mjs', rest); break;
  case 'score': runScript('skills/enhance-value/scripts/score.mjs', rest); break;
  case 'voice': runScript('skills/enhance-research/scripts/voice.mjs', rest); break;
  case 'trends': runScript('skills/enhance-research/scripts/trends.mjs', rest); break;
  case 'economics': runScript('skills/enhance-value/scripts/economics.mjs', rest); break;
  default:
    console.log(`Idea Enhancer & Value Maximiser — turn any idea or problem into a premium, monetizable concept

Commands:
  init     [dir] [--tools all|agents,claude,gemini,copilot,cursor,windsurf,cline] [--kit-dir .enhancer-kit] [--force]
  update   [dir]           refresh kit + instruction files
  remove   [dir]           uninstall: only what the kit installed, restores backups (keeps .enhancer/ outputs)
  research "<query>"       OSINT collector → .enhancer/research/<tag>.{md,json}
           [--queries-file f] [--sources github,hn,reddit,arxiv,openalex,stackoverflow,huggingface,hf-datasets,npm,wikipedia,news]
           [--limit 8] [--tag name]
  connect  "<problem>" [n] cross-domain bridges (domain × principle × enabler × business mechanism) [--json]
  score    [ideas.json]    rank enhancements with the value rubric + robustness → .enhancer/RANKING.md
  voice    "<words>"       pains, wishes, workarounds, prices from HN / GitHub issues / Stack Overflow → VOICE-*.md
  trends   "<topic>"       yearly interest signals with normalised growth → TRENDS-*.md
  economics <unit|size|vw|pmf|experiment> [--options]   unit economics, market size, Van Westendorp, PMF, sample sizes

The installer never overwrites files it did not create; --force backs them up first and remove restores them.`);
}
