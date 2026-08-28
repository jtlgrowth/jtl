#!/usr/bin/env node
// hire/discover — read the config, show the current roster, and run the overlap check.
// Run this BEFORE the interview: question 3 needs its answer.
//
//   node discover.mjs [--config path] [--probe "partnerships, affiliates, co-marketing"]

import { fileURLToPath } from 'node:url';
import { loadConfig, render } from './lib/core.mjs';
import { rosterMembers, overlap } from './lib/build.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };

let config;
try { config = loadConfig(arg('--config')); }
catch (e) {
  if (!/no hire config found/.test(e.message)) throw e;
  // A founder's first run. No stack trace: say what is missing and the one command that fixes it.
  console.log(`NO CONFIG   no hire.config.json in ${process.cwd()}`);
  console.log(`mode        first-hire`);
  console.log(`next        node "${fileURLToPath(new URL('./init.mjs', import.meta.url))}" --org "<your business>"`);
  console.log(`            (writes hire.config.json + an empty roster.json here, then the seven-question interview starts)`);
  process.exit(2);
}
const members = rosterMembers(config);

console.log(`config      ${config.__path}`);
console.log(`mode        ${members.length ? 'team' : 'first-hire'}`);
console.log(`org         ${config.org ?? '(unnamed)'}`);
console.log(`departments ${(config.departments ?? []).join(', ') || '(free-form)'}`);
console.log(`roster      ${members.length} seat(s): ${members.join(', ') || '(empty)'}`);
console.log(`surfaces    ${config.surfaces.length} (${config.surfaces.filter((s) => s.required !== false).length} required)`);
console.log(`guards      ${(config.guards ?? []).map((g) => g.id).join(', ') || '(none)'}`);

const probe = arg('--probe');
if (probe) {
  const ranked = overlap(config, probe).filter((r) => r.score > 0).slice(0, 3);
  console.log(`\nOVERLAP CHECK for: "${probe}"`);
  if (!ranked.length) console.log('  no keyword overlap with any existing seat — reads as a genuinely new seat');
  for (const r of ranked)
    console.log(`  ${(r.score * 100).toFixed(0).padStart(3)}%  ${r.name.padEnd(12)} shared: ${r.shared.join(', ')}`);
  if (ranked[0]?.score >= 0.15)
    console.log(`\n  ASK: is this a new seat, or an expansion of "${ranked[0].name}"?`);
}
if (config.verify?.length) {
  console.log('\nverify      (placeholders below resolve at apply time)');
  for (const v of config.verify) console.log(`            $ ${render(v, config.vars)}`);
}
