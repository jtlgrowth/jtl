#!/usr/bin/env node
// hire/plan — turn interview answers into the exact set of writes, and show them.
// Touches nothing on disk. This is the preview the operator approves.
//
//   node plan.mjs --answers answers.json [--config path] [--json]

import { writeFileSync } from 'node:fs';
import { loadConfig } from './lib/core.mjs';
import { loadAnswers, build, printPreview } from './lib/build.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };

const config = loadConfig(arg('--config'));
const answers = loadAnswers(arg('--answers', '-'));
const res = build(config, answers);

if (res.errs) {
  console.error(`\n\x1b[31mREFUSED\x1b[0m — ${res.errs.length} problem(s), nothing planned:\n`);
  for (const e of res.errs) console.error(`  - ${e}`);
  process.exit(1);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    actions: res.actions, skipped: res.skipped, guards: res.guards,
    files: res.stage.changed.map(([p]) => p),
  }, null, 2));
} else {
  console.log(`\n\x1b[1mHIRE PREVIEW\x1b[0m — ${[`${res.vars.Name} (${answers.name})`, answers.department, answers.role].filter(Boolean).join(' · ')}`);
  printPreview(res, config);
  const bad = res.guards.filter((g) => !g.ok);
  console.log(bad.length
    ? `\n\x1b[31mThis plan would leave the roster inconsistent. apply.mjs will refuse it.\x1b[0m\n`
    : `\n\x1b[32mNothing written yet.\x1b[0m Approve, then: node apply.mjs --answers <file> --confirm\n`);
}

const out = arg('--out');
if (out) { writeFileSync(out, JSON.stringify({ answers, actions: res.actions }, null, 2)); console.error(`plan written to ${out}`); }
