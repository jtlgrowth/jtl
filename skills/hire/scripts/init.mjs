#!/usr/bin/env node
// hire/init — bootstrap a roster for a FIRST hire: no config, no agents, nothing yet.
// Writes hire.config.json (the first-hire preset) and an empty roster.json into the
// folder the employee will live in. Refuses if a config already exists there.
//
//   node init.mjs --host codex --org "Sunrise Café" [--root .]

import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './lib/core.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };

export function init({ org, root = process.cwd(), host = 'codex' }) {
  if (!org || !org.trim()) throw new Error('--org is required: the business name, in a few words');
  if (!['codex', 'claude'].includes(host)) throw new Error('--host must be one of: codex, claude');
  const dir = resolve(root);
  const cfgPath = join(dir, 'hire.config.json');
  if (existsSync(cfgPath) || existsSync(join(dir, '.hire.config.json')))
    throw new Error(`${cfgPath} already exists — this folder already has a roster. Run discover.mjs instead.`);

  const preset = readFileSync(join(SKILL, 'examples', 'first-hire', 'hire.config.json'), 'utf8');
  // Only {{org}} is rendered now; {{root}}/{{name}}/{{skillDir}} stay as placeholders
  // for plan/apply time. JSON.stringify makes the org string safe inside the file.
  const parsed = JSON.parse(preset.replace('"{{org}}"', JSON.stringify(org.trim())));
  parsed.host = host;
  if (host === 'codex') {
    parsed.description = 'Written by $hire for a first Codex hire. Roster truth is ./roster.json. The custom agent lives in .codex/agents/<name>.toml and its readable job description lives in docs/team/<name>.md.';
    parsed.requires = [...new Set([...parsed.requires, 'sandbox'])];
    const agent = parsed.surfaces.find((surface) => surface.id === 'subagent');
    agent.path = '{{root}}/.codex/agents/{{name}}.toml';
    agent.template = 'codex-agent-first-hire.toml';
  }
  const cfg = JSON.stringify(parsed, null, 2) + '\n';

  const written = [];
  mkdirSync(dir, { recursive: true });
  writeFileSync(cfgPath, cfg);
  written.push(cfgPath);

  const rosterPath = join(dir, 'roster.json');
  if (!existsSync(rosterPath)) {
    writeFileSync(rosterPath, JSON.stringify({ agents: [], routes: {} }, null, 2) + '\n');
    written.push(rosterPath);
  }
  return { dir, written };
}

// Invoked directly? Compare real paths: ~/.claude/skills/hire may be a symlink to the repo,
// and import.meta.url is always the resolved target — a plain string compare would make the
// script exit 0 having written nothing.
const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  try {
    const host = arg('--host', 'codex');
    const { dir, written } = init({ org: arg('--org'), root: arg('--root', process.cwd()), host });
    console.log(`\x1b[32mREADY\x1b[0m first-hire roster in ${dir}\n`);
    for (const p of written) console.log(`  wrote  ${p}`);
    console.log(`\nhost        ${host}\nmode        first-hire\nnext        read references/interview-first-hire.md and ask the seven questions`);
  } catch (e) {
    console.error(`\x1b[31mNOT WRITTEN\x1b[0m ${e.message}`);
    process.exit(1);
  }
}
