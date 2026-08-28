#!/usr/bin/env node
// Dependency-free:  node skills/setup/test/tests.mjs
import { mkdtempSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderBlock, merge, apply, remove, show, START, END } from '../scripts/setup.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); pass++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); fail++; }
}
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m ?? ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const tmp = () => mkdtempSync(join(tmpdir(), 'setup-'));

check('block carries the name, the canary line, and the memory rule', () => {
  const b = renderBlock({ name: 'Ana' });
  eq(b.startsWith(START), true);
  eq(b.trimEnd().endsWith(END), true);
  eq(/Start every reply with `Ana —`/.test(b), true, 'canary');
  eq(/About my business/.test(b), true, 'memory section');
});

check('bad name, lang, tone, ask are refused by name', () => {
  for (const [o, re] of [[{ name: '' }, /--name/], [{ name: 'Ana', lang: 'klingon' }, /--lang/],
    [{ name: 'Ana', tone: 'shouty' }, /--tone/], [{ name: 'Ana', ask: ['fly'] }, /--ask/]]) {
    let threw = false; try { renderBlock(o); } catch (e) { threw = re.test(e.message); }
    eq(threw, true, JSON.stringify(o));
  }
});

check('fresh file: the block is the whole file', () => {
  eq(merge(null, renderBlock({ name: 'Ana' })), renderBlock({ name: 'Ana' }));
});

check('existing hand-written file: block is appended, nothing above it changes', () => {
  const mine = '# My rules\n\n- never touch prod\n';
  const out = merge(mine, renderBlock({ name: 'Ana' }));
  eq(out.startsWith(mine.trimEnd()), true, 'original text intact');
  eq(out.indexOf(START) > mine.length - 2, true, 'block after it');
});

check('re-run replaces the block in place and keeps the saved business facts', () => {
  const first = merge('# mine\n', renderBlock({ name: 'Ana' }))
    .replace('(nothing saved yet)', 'Sells specialty coffee in Sta. Rosa. Open 7-5, closed Sunday.');
  const second = merge(first + '\n# after\n', renderBlock({ name: 'Max', lang: 'taglish' }));
  eq((second.match(new RegExp(START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, 'one block');
  eq(/`Max —`/.test(second), true, 'new name');
  eq(/`Ana —`/.test(second), false, 'old name gone');
  eq(/Sta\. Rosa/.test(second), true, 'business facts kept');
  eq(/^# mine\n/.test(second), true, 'text above kept');
  eq(/# after\n?$/.test(second), true, 'text below kept');
});

check('one marker without the other aborts instead of guessing', () => {
  let threw = false;
  try { merge(`x\n${START}\nno end`, renderBlock({ name: 'Ana' })); } catch (e) { threw = /marker/.test(e.message); }
  eq(threw, true);
});

check('Codex default creates ~/.codex/AGENTS.md; show and remove round-trip', () => {
  const home = tmp();
  const r = apply({ name: 'Vee' }, { home });
  eq(r.created, true);
  eq(existsSync(join(home, '.codex', 'AGENTS.md')), true);
  eq(show({ home }).block.includes('`Vee —`'), true);
  eq(apply({ name: 'Vee', tone: 'warm' }, { home }).replaced, true);
  eq(remove({ home }).removed, true);
  eq(show({ home }).block, null);
  rmSync(home, { recursive: true, force: true });
});

check('Claude host remains supported at ~/.claude/CLAUDE.md', () => {
  const home = tmp();
  apply({ name: 'Ana' }, { home, host: 'claude' });
  eq(existsSync(join(home, '.claude', 'CLAUDE.md')), true);
  eq(show({ home, host: 'claude' }).block.includes('`Ana —`'), true);
  rmSync(home, { recursive: true, force: true });
});

check('dry-run writes nothing', () => {
  const home = tmp();
  apply({ name: 'Ana' }, { home, dryRun: true });
  eq(existsSync(join(home, '.codex', 'AGENTS.md')), false);
  rmSync(home, { recursive: true, force: true });
});

check('CLI: writes through a symlinked skill dir, then --show exits 0', () => {
  const home = tmp();
  const link = join(home, 'skill-link'); symlinkSync(SKILL, link, 'dir');
  const w = spawnSync(process.execPath, [join(link, 'scripts', 'setup.mjs'), '--name', 'Ana', '--home', home], { encoding: 'utf8' });
  eq(w.status, 0, w.stderr);
  eq(/CREATED/.test(w.stdout), true, w.stdout);
  const s = spawnSync(process.execPath, [join(SKILL, 'scripts', 'setup.mjs'), '--show', '--home', home], { encoding: 'utf8' });
  eq(s.status, 0);
  rmSync(home, { recursive: true, force: true });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
