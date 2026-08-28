#!/usr/bin/env node
// hire/apply — write every surface, or none of them.
//
//   node apply.mjs --answers answers.json --confirm [--config path] [--skip-verify]
//
// Refuses on: a validation error, a missing REQUIRED surface, a job doc that fails the
// org's section standard, or any failing guard. A half-hired seat is worse than no seat.

import { spawnSync } from 'node:child_process';
import { loadConfig, render } from './lib/core.mjs';
import { loadAnswers, build, printPreview } from './lib/build.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };

const config = loadConfig(arg('--config'));
const answers = loadAnswers(arg('--answers', '-'));
const res = build(config, answers);

if (res.errs) {
  console.error(`\n\x1b[31mREFUSED — nothing written.\x1b[0m ${res.errs.length} problem(s):\n`);
  for (const e of res.errs) console.error(`  - ${e}`);
  process.exit(1);
}

const failed = res.guards.filter((g) => !g.ok);
if (failed.length) {
  console.error(`\n\x1b[31mREFUSED — nothing written.\x1b[0m Guard(s) failed:\n`);
  for (const g of failed) {
    console.error(`  - ${g.id}: ${g.detail}`);
    if (g.message) console.error(`      ${g.message}`);
  }
  process.exit(1);
}

if (!process.argv.includes('--confirm')) {
  printPreview(res, config);
  console.error(`\n\x1b[33mDry run.\x1b[0m Re-run with --confirm to write.\n`);
  process.exit(0);
}

const written = res.stage.commit();
console.log(`\n\x1b[32mHIRED\x1b[0m ${res.vars.Name} — ${written.length} file(s) written:\n`);
for (const p of written) console.log(`  ${p}`);
if (res.skipped.length) {
  console.log(`\nOptional surfaces skipped:`);
  for (const s of res.skipped) console.log(`  - ${s}`);
}

if (process.argv.includes('--skip-verify') || !config.verify?.length) process.exit(0);

console.log(`\n\x1b[1mVERIFY\x1b[0m`);
let bad = 0;
for (const cmd of config.verify) {
  const rendered = render(cmd, res.vars);
  const r = spawnSync(rendered, { shell: true, encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) bad++;
  console.log(`  ${ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  $ ${rendered}`);
  const tail = (r.stdout || '').trim().split('\n').filter((l) => l.includes(answers.name));
  for (const l of tail.slice(0, 4)) console.log(`        ${l.trim()}`);
  if (!ok && r.stderr) console.log(`        ${r.stderr.trim().split('\n').slice(-2).join('\n        ')}`);
}
console.log(bad ? `\n\x1b[33m${bad} verify command(s) failed — files ARE written, go read them.\x1b[0m\n` : '');
