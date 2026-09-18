#!/usr/bin/env node
// Dependency-free:  node skills/setup/test/tests.mjs
import { mkdtempSync, existsSync, rmSync, symlinkSync, readFileSync, writeFileSync, mkdirSync, statSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderBlock, merge, apply, remove, show, setAlias, findOnPath, shimPath, START, END, SHIM_MARK } from '../scripts/setup.mjs';

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
  eq(/Start every reply with `Ana:`/.test(b), true, 'canary');
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
  eq(/`Max:`/.test(second), true, 'new name');
  eq(/`Ana:`/.test(second), false, 'old name gone');
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
  eq(show({ home }).block.includes('`Vee:`'), true);
  eq(apply({ name: 'Vee', tone: 'warm' }, { home }).replaced, true);
  eq(remove({ home }).removed, true);
  eq(show({ home }).block, null);
  rmSync(home, { recursive: true, force: true });
});

check('Claude host remains supported at ~/.claude/CLAUDE.md', () => {
  const home = tmp();
  apply({ name: 'Ana' }, { home, host: 'claude' });
  eq(existsSync(join(home, '.claude', 'CLAUDE.md')), true);
  eq(show({ home, host: 'claude' }).block.includes('`Ana:`'), true);
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

// ---- alias: the launcher that lets them type `ana` instead of `claude` ----

check('alias: Mac/Linux launcher is written, executable, and runs claude', () => {
  const home = tmp();
  const r = apply({ name: 'Ana', alias: 'ana' }, { home, host: 'claude', platform: 'darwin', envPath: '/usr/bin' });
  const p = join(home, '.local', 'bin', 'ana');
  eq(r.alias.path, p);
  eq(readFileSync(p, 'utf8'), `#!/bin/sh\n# ${SHIM_MARK}: opens Claude Code as Ana\nexec claude "$@"\n`);
  // Windows filesystems carry no executable bit; the .cmd case below covers that host.
  if (process.platform !== 'win32') eq((statSync(p).mode & 0o111) !== 0, true, 'executable bit');
  eq(r.alias.onPath, false, 'reports ~/.local/bin missing from PATH');
  eq(/typing `ana`/.test(show({ home, host: 'claude' }).block), true, 'block names the alias');
  rmSync(home, { recursive: true, force: true });
});

check('alias: Windows gets ana.cmd, CRLF, works in PowerShell and cmd, no profile touched', () => {
  const home = tmp();
  const bin = join(home, '.local', 'bin');
  const r = apply({ name: 'Ana', alias: 'ana' }, { home, host: 'claude', platform: 'win32', envPath: `${bin};C:\\Windows` });
  eq(r.alias.path, join(bin, 'ana.cmd'));
  eq(readFileSync(r.alias.path, 'utf8'), `@rem ${SHIM_MARK}: opens Claude Code as Ana\r\n@claude %*\r\n`);
  eq(r.alias.onPath, true);
  eq(existsSync(join(home, 'Documents')), false, 'no PowerShell profile written');
  rmSync(home, { recursive: true, force: true });
});

check('alias: Codex host launcher opens codex', () => {
  const home = tmp();
  const r = apply({ name: 'Vee', alias: 'vee' }, { home, platform: 'darwin', envPath: '' });
  eq(/exec codex "\$@"/.test(readFileSync(r.alias.path, 'utf8')), true);
  rmSync(home, { recursive: true, force: true });
});

check('alias: words a terminal already answers to are refused, and nothing is written', () => {
  const home = tmp();
  for (const w of ['test', 'cd', 'dir', 'cls', 'ls', 'iex', 'where', 'claude']) {
    let threw = false;
    try { apply({ name: 'Ana', alias: w }, { home, host: 'claude', platform: 'darwin', envPath: '' }); } catch (e) { threw = /--alias/.test(e.message); }
    eq(threw, true, w);
  }
  eq(existsSync(join(home, '.claude', 'CLAUDE.md')), false, 'no block written on a refused alias');
  eq(existsSync(join(home, '.local', 'bin')), false, 'no launcher written');
  rmSync(home, { recursive: true, force: true });
});

check('alias: a word already on PATH is refused (posix and Windows PATHEXT)', () => {
  const home = tmp();
  const other = join(home, 'otherbin'); mkdirSync(other);
  writeFileSync(join(other, 'luna'), '#!/bin/sh\n'); chmodSync(join(other, 'luna'), 0o755);
  writeFileSync(join(other, 'kai.exe'), '');
  let threw = false;
  // A posix PATH is ':'-separated, so it can only be simulated on a host whose paths have no drive letter.
  if (process.platform !== 'win32') {
    try { setAlias({ alias: 'luna', name: 'Luna', host: 'claude' }, { home, platform: 'darwin', envPath: other }); } catch (e) { threw = /already runs/.test(e.message); }
    eq(threw, true, 'posix clash');
    threw = false;
  }
  try { setAlias({ alias: 'kai', name: 'Kai', host: 'claude' }, { home, platform: 'win32', envPath: other }); } catch (e) { threw = /already runs/.test(e.message); }
  eq(threw, true, 'windows .exe clash');
  eq(findOnPath('nobody-has-this', { envPath: other, platform: 'darwin' }), null);
  rmSync(home, { recursive: true, force: true });
});

check('alias: never overwrites a file /setup did not write', () => {
  const home = tmp();
  const p = shimPath(home, 'ana', 'darwin'); mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, '#!/bin/sh\necho mine\n');
  let threw = false;
  try { setAlias({ alias: 'ana', name: 'Ana', host: 'claude' }, { home, platform: 'darwin', envPath: dirname(p) }); } catch (e) { threw = /did not write/.test(e.message); }
  eq(threw, true);
  eq(readFileSync(p, 'utf8'), '#!/bin/sh\necho mine\n', 'their file untouched');
  rmSync(home, { recursive: true, force: true });
});

check('alias: re-run is byte-identical; a rename removes the old launcher; --remove cleans up', () => {
  const home = tmp();
  const bin = join(home, '.local', 'bin');
  const o = { home, host: 'claude', platform: 'darwin', envPath: bin };
  apply({ name: 'Ana', alias: 'ana' }, o);
  const first = readFileSync(join(bin, 'ana'), 'utf8') + readFileSync(join(home, '.claude', 'CLAUDE.md'), 'utf8');
  apply({ name: 'Ana', alias: 'ana' }, o);
  eq(readFileSync(join(bin, 'ana'), 'utf8') + readFileSync(join(home, '.claude', 'CLAUDE.md'), 'utf8'), first, 'idempotent');
  apply({ name: 'Max', alias: 'max' }, o);
  eq(existsSync(join(bin, 'ana')), false, 'old launcher gone');
  eq(existsSync(join(bin, 'max')), true, 'new launcher there');
  const r = remove({ home, host: 'claude', platform: 'darwin' });
  eq(r.aliasRemoved, true);
  eq(existsSync(join(bin, 'max')), false, 'launcher removed with the block');
  rmSync(home, { recursive: true, force: true });
});

check('upgrade: a block written with the old marker is replaced, not duplicated', () => {
  const oldStart = '<!-- setup:start \u2014 written by /setup, edit freely, re-run /setup to replace -->';
  const legacy = `# mine\n\n${oldStart}\n# Ana\n\n## About my business\n\nSells coffee.\n${END}\n`;
  const out = merge(legacy, renderBlock({ name: 'Ana', alias: 'ana' }));
  eq(out.includes(oldStart), false, 'old marker gone');
  eq(out.split(START).length - 1, 1, 'one block');
  eq(/Sells coffee\./.test(out), true, 'facts kept');
});

check('CLI: a real run makes a launcher that actually starts the target command', () => {
  if (process.platform === 'win32') return;
  const home = tmp();
  const fake = join(home, 'fakebin'); mkdirSync(fake);
  writeFileSync(join(fake, 'claude'), '#!/bin/sh\necho "fake claude $*"\n'); chmodSync(join(fake, 'claude'), 0o755);
  const bin = join(home, '.local', 'bin');
  const env = { ...process.env, PATH: `${bin}:${fake}:/usr/bin:/bin` };
  const w = spawnSync(process.execPath, [join(SKILL, 'scripts', 'setup.mjs'), '--host', 'claude', '--name', 'Ana', '--alias', 'ana', '--home', home], { encoding: 'utf8', env });
  eq(w.status, 0, w.stderr);
  eq(/ALIAS/.test(w.stdout) && /type ana/.test(w.stdout), true, w.stdout);
  const run = spawnSync('ana', ['--version'], { encoding: 'utf8', env });
  eq(run.stdout.trim(), 'fake claude --version');
  rmSync(home, { recursive: true, force: true });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
