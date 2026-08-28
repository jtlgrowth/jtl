#!/usr/bin/env node
// Dependency-free test run:  node skills/hire/test/tests.mjs
// Covers the promises the README makes, so they cannot quietly stop being true.

import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, pointerSet, Stage, applyOp, runGuards } from '../scripts/lib/core.mjs';
import { build } from '../scripts/lib/build.mjs';
import { init } from '../scripts/init.mjs';

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;

function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); pass++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); fail++; }
}
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m ?? ''} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };

// ---------------------------------------------------------------- templating

check('render fills placeholders and joins arrays', () => {
  eq(render('{{a}} / {{b}}', { a: 'x', b: ['p', 'q'] }), 'x / p, q');
});

check('sentence filter adds terminal punctuation only when missing', () => {
  eq(render('{{s|sentence}}', { s: 'no period' }), 'no period.');
  eq(render('{{s|sentence}}', { s: 'has one.' }), 'has one.');
});

check('json filter emits real JSON, not a joined string', () => {
  eq(render('{{k|json}}', { k: ['a', 'b'] }), '["a","b"]');
});

check('unknown placeholder is left visible, not blanked', () => {
  eq(render('{{nope}}', {}), '{{nope}}');
});

check('unknown filter throws instead of silently passing through', () => {
  let threw = false;
  try { render('{{a|bogus}}', { a: 'x' }); } catch { threw = true; }
  eq(threw, true);
});

// ---------------------------------------------------------------- pointers

check('pointer append adds once and is idempotent', () => {
  const doc = { list: ['a'] };
  eq(pointerSet(doc, '/list/-', 'b').changed, true);
  eq(pointerSet(doc, '/list/-', 'b').changed, false);
  eq(doc.list.join(','), 'a,b');
});

// ---------------------------------------------------------------- line endings

check('line-insert preserves CRLF line endings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-crlf-'));
  const f = join(dir, 'r.md');
  writeFileSync(f, '| A | one |\r\n| B | two |\r\n');
  const stage = new Stage();
  applyOp({ id: 't', op: 'line-insert', path: f, anchor: '^\\| [A-Z] \\|', last: true,
            line: '| C | three |' }, stage, {}, SKILL);
  const out = stage.read(f);
  eq(/\| C \| three \|\r\n/.test(out), true, 'inserted line should end CRLF');
  eq(/[^\r]\n/.test(out), false, 'no bare LF should remain');
  rmSync(dir, { recursive: true, force: true });
});

check('anchors still match when the file is CRLF', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-anchor-'));
  const f = join(dir, 'a.json');
  writeFileSync(f, '{\r\n  "seats": {\r\n  }\r\n}\r\n');
  const stage = new Stage();
  applyOp({ id: 't', op: 'line-insert', path: f, anchor: '^  "seats": \\{',
            line: '    "x": 1' }, stage, {}, SKILL);
  eq(stage.read(f).includes('"x": 1'), true);
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- guards

check('set-equality guard fails when the two sides drift', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-guard-'));
  const f = join(dir, 'r.json');
  writeFileSync(f, JSON.stringify({ agents: ['a', 'b'], routes: { a: {} } }));
  const stage = new Stage();
  const [g] = runGuards({ guards: [{ id: 'parity', type: 'set-equality',
    a: { path: f, pointer: '/agents', kind: 'array' },
    b: { path: f, pointer: '/routes', kind: 'keys' } }] }, stage, {});
  eq(g.ok, false);
  eq(g.detail.includes('b'), true, 'should name the missing member');
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- path identity

check('one file reached by two path spellings stages as one file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-path-'));
  const f = join(dir, 'r.json');
  writeFileSync(f, '{\n  "a": [],\n  "b": {}\n}\n');
  const stage = new Stage();
  // A different string for the same file. On Windows the real case is mixed
  // separators from "{{root}}/file.json"; a traversal segment reproduces the
  // same "two spellings, one file" condition on every platform, which is the
  // point - the macOS-only version of this test passed even with the bug in.
  const mixed = dir + '/sub/../r.json';   // raw concatenation: join() would normalise it away
  applyOp({ id: '1', op: 'json-set', path: f, pointer: '/a/-', value: 'x' }, stage, {}, SKILL);
  applyOp({ id: '2', op: 'json-set', path: mixed, pointer: '/b/y', value: 1 }, stage, {}, SKILL);
  eq(stage.changed.length, 1, 'should be one staged file, not two');
  const doc = JSON.parse(stage.read(f));
  eq(doc.a.join(','), 'x', 'first edit must survive the second');
  eq(doc.b.y, 1, 'second edit must be present');
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- end to end

const demo = join(SKILL, 'examples', 'northwind');
const config = JSON.parse(readFileSync(join(demo, 'hire.config.json'), 'utf8'));
config.__path = join(demo, 'hire.config.json');
config.vars = { root: join(demo, 'repo'), home: tmpdir() };
const answers = JSON.parse(readFileSync(join(demo, 'answers-tess.json'), 'utf8'));

check('a valid hire plans every surface without touching disk', () => {
  const before = readFileSync(join(demo, 'repo', 'roster.json'), 'utf8');
  const res = build(config, answers);
  if (res.errs) throw new Error(res.errs.join('; '));
  eq(res.stage.changed.length, 4);
  eq(res.guards.every((g) => g.ok), true);
  eq(readFileSync(join(demo, 'repo', 'roster.json'), 'utf8'), before, 'disk must be unchanged');
});

check('hiring an existing member is refused', () => {
  const res = build(config, { ...answers, name: 'mila' });
  eq(!!res.errs, true);
  eq(res.errs.some((e) => e.includes('already on the roster')), true);
});

check('a missing required answer is refused with the field named', () => {
  const res = build(config, { ...answers, nevers: [] });
  eq(!!res.errs, true);
  eq(res.errs.some((e) => e.includes('nevers')), true);
});

check('an unknown department is refused', () => {
  const res = build(config, { ...answers, department: 'nowhere' });
  eq(res.errs.some((e) => e.includes('nowhere')), true);
});

check('dropping a surface trips the guard, so the hire is refused', () => {
  const broken = { ...config, surfaces: config.surfaces.filter((s) => s.id !== 'roster-route') };
  const res = build(broken, answers);
  if (res.errs) throw new Error('should reach the guard stage, got: ' + res.errs.join('; '));
  eq(res.guards.some((g) => !g.ok), true);
});

check('an existing file is never overwritten', () => {
  const res = build(config, { ...answers, name: 'mila-two' });
  if (res.errs) throw new Error(res.errs.join('; '));
  const one = build({ ...config, surfaces: [{ id: 'job-doc', op: 'file-from-template',
    path: join(demo, 'repo', 'docs', 'team', 'mila.md'), template: 'job-doc.md' }] }, answers);
  eq(!!one.errs, true);
  eq(one.errs[0].includes('refusing to overwrite'), true);
});

check('a bad anchor that would break JSON aborts the hire', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-badjson-'));
  const f = join(dir, 'r.json');
  writeFileSync(f, '{\n  "agents": []\n}\n');
  const bad = { ...config,
    surfaces: [{ id: 'oops', op: 'line-insert', path: f, anchor: '^\\{', line: 'not json' }],
    guards: [], jobDoc: null };
  const res = build(bad, answers);
  eq(!!res.errs, true);
  eq(res.errs[0].includes('invalid JSON'), true);
  rmSync(dir, { recursive: true, force: true });
});

check('the committed demo after/ state matches what a hire produces', () => {
  const res = build(config, answers);
  const produced = res.stage.read(join(demo, 'repo', 'roster.json'));
  const committed = readFileSync(join(demo, 'after', 'roster.json'), 'utf8');
  eq(produced, committed, 'examples/northwind/after is stale — re-run run-demo.sh --apply');
});


// ---------------------------------------------------------------- first hire (no config, empty roster)

const fh = join(SKILL, 'examples', 'first-hire');
const fhAnswers = JSON.parse(readFileSync(join(fh, 'answers-maya.json'), 'utf8'));
const fhCodexAnswers = { ...fhAnswers, sandbox: 'workspace-write' };
const node = (script, args, cwd) => spawnSync(process.execPath, [join(SKILL, 'scripts', script), ...args], { cwd, encoding: 'utf8' });

check('discover with no config exits 2 with the first-hire banner, not a stack trace', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-noconfig-'));
  const r = node('discover.mjs', [], dir);
  eq(r.status, 2, 'exit code');
  eq(/NO CONFIG/.test(r.stdout), true, 'banner');
  eq(/mode\s+first-hire/.test(r.stdout), true, 'mode line');
  eq(/init\.mjs/.test(r.stdout), true, 'names the next command');
  eq(/at .*\.mjs:\d+/.test(r.stderr), false, 'no stack trace');
  rmSync(dir, { recursive: true, force: true });
});

check('init writes a loadable config and an empty roster, and refuses to run twice', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-init-'));
  const { written } = init({ org: 'Sunrise Café', root: dir });
  eq(written.length, 2);
  const cfg = JSON.parse(readFileSync(join(dir, 'hire.config.json'), 'utf8'));
  eq(cfg.org, 'Sunrise Café');
  eq(cfg.preset, 'first-hire');
  eq(cfg.host, 'codex');
  eq(cfg.surfaces.find((s) => s.id === 'subagent').path, '{{root}}/.codex/agents/{{name}}.toml');
  eq(JSON.parse(readFileSync(join(dir, 'roster.json'), 'utf8')).agents.length, 0);
  const r = node('discover.mjs', [], dir);
  eq(r.status, 0);
  eq(/mode\s+first-hire/.test(r.stdout), true, 'empty roster reads as first-hire');
  eq(/roster\s+0 seat/.test(r.stdout), true);
  let threw = false;
  try { init({ org: 'Again', root: dir }); } catch (e) { threw = /already exists/.test(e.message); }
  eq(threw, true, 'second init must refuse');
  rmSync(dir, { recursive: true, force: true });
});

check('init runs when invoked through a symlinked skill dir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-init-link-'));
  const link = join(dir, 'skill-link');
  symlinkSync(SKILL, link, 'dir');
  const r = spawnSync(process.execPath, [join(link, 'scripts', 'init.mjs'), '--org', 'Linked Co', '--root', join(dir, 'desk')], { encoding: 'utf8' });
  eq(r.status, 0, r.stderr);
  eq(existsSync(join(dir, 'desk', 'hire.config.json')), true, 'config must be written via the symlink path');
  rmSync(dir, { recursive: true, force: true });
});

check('init refuses an empty org', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-init-org-'));
  let threw = false;
  try { init({ org: '  ', root: dir }); } catch (e) { threw = /--org/.test(e.message); }
  eq(threw, true);
  eq(existsSync(join(dir, 'hire.config.json')), false, 'nothing written');
  rmSync(dir, { recursive: true, force: true });
});

function firstHireConfig(dir, host = 'codex') {
  init({ org: 'Sunrise Café', root: dir, host });
  const cfg = JSON.parse(readFileSync(join(dir, 'hire.config.json'), 'utf8'));
  cfg.today = '2026-08-21';
  cfg.__path = join(dir, 'hire.config.json'); cfg.vars = { root: dir, home: tmpdir() };
  return cfg;
}

check('a Codex first hire plans 4 surfaces, passes the guard, and emits a custom agent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-fh-'));
  const cfg = firstHireConfig(dir);
  const res = build(cfg, fhCodexAnswers);
  if (res.errs) throw new Error(res.errs.join('; '));
  eq(res.actions.length, 4);
  eq(res.stage.changed.length, 3, 'job doc + subagent + roster.json');
  eq(res.guards.every((g) => g.ok), true);
  const jd = res.stage.read(join(dir, 'docs', 'team', 'maya.md'));
  eq(/\*\*First shift:\*\*/.test(jd), true, 'job doc names the first shift');
  const agent = res.stage.read(join(dir, '.codex', 'agents', 'maya.toml'));
  eq(/^name = "maya"\n/.test(agent), true, 'Codex agent name');
  eq(/developer_instructions = """/.test(agent), true, 'Codex developer instructions');
  eq(/sandbox_mode = "workspace-write"/.test(agent), true, 'Codex sandbox');
  eq(/\{\{/.test(jd + agent), false, 'no unrendered placeholder');
  eq(existsSync(join(dir, 'docs')), false, 'plan must not touch disk');
  rmSync(dir, { recursive: true, force: true });
});

check('a first hire without a first shift is refused by name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-fh-req-'));
  const res = build(firstHireConfig(dir), { ...fhCodexAnswers, firstShift: '' });
  eq(!!res.errs, true);
  eq(res.errs.some((e) => e.includes('firstShift')), true);
  rmSync(dir, { recursive: true, force: true });
});

check('the second hire sees the first: same name refused, roster reads as team', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-fh-second-'));
  const cfg = firstHireConfig(dir);
  const first = build(cfg, fhCodexAnswers);
  if (first.errs) throw new Error(first.errs.join('; '));
  first.stage.commit();
  const dup = build(cfg, fhCodexAnswers);
  eq(dup.errs.some((e) => e.includes('already on the roster')), true);
  const other = build(cfg, { ...fhCodexAnswers, name: 'theo', display: 'Theo' });
  if (other.errs) throw new Error(other.errs.join('; '));
  eq(other.guards.every((g) => g.ok), true);
  writeFileSync(join(dir, 'hire.config.json'), JSON.stringify({ ...cfg, vars: { root: '.' } }, null, 2));
  const r = node('discover.mjs', [], dir);
  eq(/mode\s+team/.test(r.stdout), true, 'one seat on the roster = team mode');
  eq(/roster\s+1 seat\(s\): maya/.test(r.stdout), true);
  rmSync(dir, { recursive: true, force: true });
});

check('verify-roster passes for a hired name and fails for a missing one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-fh-verify-'));
  const cfg = firstHireConfig(dir);
  build(cfg, fhCodexAnswers).stage.commit();
  writeFileSync(join(dir, 'hire.config.json'), JSON.stringify({ ...cfg, vars: { root: '.' } }, null, 2));
  const ok = node('verify-roster.mjs', ['--config', join(dir, 'hire.config.json'), '--name', 'maya'], dir);
  eq(ok.status, 0, ok.stderr);
  const bad = node('verify-roster.mjs', ['--config', join(dir, 'hire.config.json'), '--name', 'nobody'], dir);
  eq(bad.status, 1);
  rmSync(dir, { recursive: true, force: true });
});

check('the first-hire preset has no inline-quoted verify command (cmd.exe safe)', () => {
  const cfg = JSON.parse(readFileSync(join(fh, 'hire.config.json'), 'utf8'));
  for (const v of cfg.verify) eq(/node -e|require\(/.test(v), false, `inline code in verify: ${v}`);
  for (const s of cfg.surfaces) eq(s.path.startsWith('{{root}}/'), true, `${s.id} path must hang off root`);
});

check('the committed first-hire after/ state matches what a hire produces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hire-fh-after-'));
  const res = build(firstHireConfig(dir, 'claude'), fhAnswers);
  if (res.errs) throw new Error(res.errs.join('; '));
  for (const rel of ['roster.json', 'docs/team/maya.md', '.claude/agents/maya.md']) {
    const produced = res.stage.read(join(dir, ...rel.split('/')));
    const committed = readFileSync(join(fh, 'after', ...rel.split('/')), 'utf8');
    eq(produced, committed, `examples/first-hire/after/${rel} is stale`);
  }
  rmSync(dir, { recursive: true, force: true });
});

console.log(`\n${pass} passed, ${fail} failed`);
if (existsSync(join(demo, 'repo', 'docs', 'team', 'tess.md'))) {
  console.log('WARNING: a test wrote into examples/northwind/repo — that should never happen');
  process.exit(1);
}
process.exit(fail ? 1 : 0);
