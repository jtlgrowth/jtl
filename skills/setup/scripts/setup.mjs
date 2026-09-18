#!/usr/bin/env node
// setup: give Codex or Claude Code a name, three standing rules, and a command to open it.
// Idempotent: the block lives between two markers and is replaced in place. Anything
// outside the markers is never touched. No dependencies, Node 18+.
//
//   node setup.mjs --host codex --name Ana --lang taglish --tone direct --ask "delete,send,pay" [--alias ana] [--memory on|off] [--home <dir>] [--dry-run]
//   node setup.mjs --host codex --show [--home <dir>]
//   node setup.mjs --host codex --remove [--home <dir>]

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

export const START = '<!-- setup:start, written by /setup, edit freely, re-run /setup to replace -->';
export const END = '<!-- setup:end -->';
// Older blocks were opened with this marker; re-runs still find and replace them.
const OLD_STARTS = ['<!-- setup:start — written by /setup, edit freely, re-run /setup to replace -->'];

const LANG = {
  english: 'Reply in plain English.',
  taglish: 'Reply in Taglish: English with Filipino where it is natural, the way people in a Manila office actually talk.',
  tagalog: 'Reply in Tagalog.',
};
const TONE = {
  direct: 'Short and direct. Lead with the answer, then the reason. No filler, no pep talk.',
  warm: 'Warm but brief. Lead with the answer; one friendly line is enough.',
  formal: 'Formal and complete. Full sentences, no slang.',
};
const ASK = {
  delete: 'deleting or overwriting files',
  send: 'sending anything to a customer, client, or the public (email, message, post)',
  pay: 'spending money or changing billing',
  install: 'installing software',
};

export function renderBlock({ name, lang = 'english', tone = 'direct', ask = ['delete', 'send', 'pay'], memory = true, alias = null }) {
  if (!name || !/^[A-Za-z][A-Za-z0-9 '-]{0,30}$/.test(name)) throw new Error('--name: letters, up to 31 chars');
  if (!LANG[lang]) throw new Error(`--lang must be one of: ${Object.keys(LANG).join(', ')}`);
  if (!TONE[tone]) throw new Error(`--tone must be one of: ${Object.keys(TONE).join(', ')}`);
  const asks = ask.filter(Boolean);
  for (const a of asks) if (!ASK[a]) throw new Error(`--ask: unknown "${a}" (known: ${Object.keys(ASK).join(', ')})`);
  const lines = [
    START,
    `# ${name}`,
    '',
    `You are ${name}, my chief operating officer. You run the work; I make the decisions.`,
    '',
    `- Start every reply with \`${name}:\` so I know these instructions are loaded.`,
    `- ${LANG[lang]} ${TONE[tone]}`,
  ];
  if (asks.length) lines.push(`- Ask me first before: ${asks.map((a) => ASK[a]).join('; ')}. Everything else, do it and tell me after.`);
  if (memory) lines.push(
    '- When I tell you a fact about my business (what I sell, prices, hours, how I talk, who my customers are), save it under "## About my business" in this file so you remember it next session. Keep that section short; rewrite, do not append forever.',
  );
  if (alias) lines.push(`- I open you by typing \`${alias}\` in a terminal.`);
  lines.push('', '## About my business', '', '(nothing saved yet)', END);
  return lines.join('\n') + '\n';
}

export function targetPath(home = homedir(), host = 'codex') {
  if (host === 'codex') return join(home, '.codex', 'AGENTS.md');
  if (host === 'claude') return join(home, '.claude', 'CLAUDE.md');
  throw new Error('--host must be one of: codex, claude');
}

// Where the current block starts, whichever marker version wrote it.
function findStart(text) {
  for (const m of [START, ...OLD_STARTS]) { const i = text.indexOf(m); if (i > -1) return i; }
  return -1;
}

export function merge(existing, block) {
  if (existing == null || existing === '') return block;
  const s = findStart(existing), e = existing.indexOf(END);
  if (s > -1 && e > s) {
    // Keep whatever the user has saved under "## About my business" across re-runs.
    const old = existing.slice(s, e + END.length);
    const kept = old.match(/## About my business\n([\s\S]*?)\n<!-- setup:end -->/)?.[1]?.trim();
    let next = block;
    if (kept && kept !== '(nothing saved yet)') next = block.replace('(nothing saved yet)', kept);
    return existing.slice(0, s) + next.trimEnd() + existing.slice(e + END.length);
  }
  if (s > -1 || e > -1) throw new Error('found one setup marker without the other; fix the file by hand');
  return existing.replace(/\s*$/, '\n\n') + block;
}

// ---------------------------------------------------------------- alias ----
// The alias is a two-line launcher in ~/.local/bin, the folder the installer already puts
// on PATH. A launcher, not a shell alias: Windows blocks PowerShell profile scripts by
// default, and a .cmd file runs the same from PowerShell and from Command Prompt.

export const SHIM_MARK = 'written by /setup';

// Words a terminal already answers to: shell keywords, everyday commands, cmd built-ins,
// and PowerShell's built-in aliases (which win over anything on PATH).
const TAKEN = new Set(`
alias bash break call case cat cd chdir claude clear cls code codex color copy cp curl date del dir
do done echo else endlocal erase esac eval exec exit export false fi for function git goto if kill
ls man md mkdir mklink move mv node npm npx open path pause popd prompt pushd pwd python python3 rd
read ren return rm rmdir set setlocal sh shift sleep sort source start sudo tee test then time
title true type ver vol wget where which while write zsh
ac clc clhy cli clp clv cnsn compare cpi cpp cvpa dbp diff dnsn ebp epal epcsv epsn etsn exsn fc
fhx fl foreach ft fw gal gbp gc gcb gci gcm gcs gdr ghy gi gin gjb gl gm gmo gp gps gpv group gsn
gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi iwr lp measure mi
mount mp nal ndr ni nmo npssc nsn nv ogv oh ps r rbp rcjb rcsn rdr ri rjb rmo rni rnp rp rsn rsnp
rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select shcm si sl sls sp spjb spps spsv stz sujb sv
swmi trcm wjb
`.trim().split(/\s+/));

export function aliasFor(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function shimPath(home, alias, platform = process.platform) {
  return join(home, '.local', 'bin', platform === 'win32' ? `${alias}.cmd` : alias);
}

export function renderShim({ name, host = 'codex', platform = process.platform }) {
  const bin = host === 'claude' ? 'claude' : 'codex';
  const what = host === 'claude' ? 'Claude Code' : 'Codex';
  if (platform === 'win32') return `@rem ${SHIM_MARK}: opens ${what} as ${name}\r\n@${bin} %*\r\n`;
  return `#!/bin/sh\n# ${SHIM_MARK}: opens ${what} as ${name}\nexec ${bin} "$@"\n`;
}

const norm = (p, platform) => { const r = resolve(p).replace(/[\\/]+$/, ''); return platform === 'win32' ? r.toLowerCase() : r; };

function pathDirs(envPath, platform) {
  return String(envPath || '').split(platform === 'win32' ? ';' : ':').filter(Boolean);
}

export function onPath(dir, envPath = process.env.PATH, platform = process.platform) {
  return pathDirs(envPath, platform).some((d) => norm(d, platform) === norm(dir, platform));
}

// First file on PATH that the word would run, ignoring our own launcher.
export function findOnPath(word, { envPath = process.env.PATH, platform = process.platform, skip = null } = {}) {
  const exts = platform === 'win32'
    ? [...new Set([...(process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').toLowerCase().split(';').filter(Boolean), '.ps1'])]
    : [''];
  for (const dir of pathDirs(envPath, platform)) {
    for (const ext of exts) {
      const p = join(dir, word + ext);
      if (skip && norm(p, platform) === norm(skip, platform)) continue;
      try { if (statSync(p).isFile()) return p; } catch { /* not there */ }
    }
  }
  return null;
}

const ours = (p) => existsSync(p) && readFileSync(p, 'utf8').includes(SHIM_MARK);

export function setAlias({ alias, name, host = 'codex' }, { home = homedir(), platform = process.platform, envPath = process.env.PATH, dryRun = false } = {}) {
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(alias || '')) throw new Error('--alias: lowercase letters, digits or -, starting with a letter');
  if (TAKEN.has(alias)) throw new Error(`--alias: "${alias}" is already a command in Mac, Windows or PowerShell terminals, pick another word`);
  const path = shimPath(home, alias, platform);
  if (existsSync(path) && !ours(path)) throw new Error(`--alias: ${path} already exists and /setup did not write it, pick another word`);
  const clash = findOnPath(alias, { envPath, platform, skip: path });
  if (clash) throw new Error(`--alias: "${alias}" already runs ${clash}, pick another word`);
  const body = renderShim({ name, host, platform });
  let persisted = false;
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
    if (platform !== 'win32') chmodSync(path, 0o755);
    // The Claude installer saves ~/.local/bin in the Windows user PATH; the Codex one
    // does not (codex lives in npm's folder). Save it here so the alias works either way.
    if (platform === 'win32' && process.platform === 'win32' && !onPath(dirname(path), envPath, platform)) {
      persisted = persistWindowsUserPath(dirname(path));
    }
  }
  return { path, body, onPath: onPath(dirname(path), envPath, platform), persisted };
}

// Add a folder to the Windows user PATH for every new window, once. Same logic the
// installer uses: %VARS% expanded before comparing, case-insensitive, no duplicates.
export function persistWindowsUserPath(dir) {
  const d = dir.replace(/'/g, "''");
  const ps = `$d='${d}'; $u=[Environment]::GetEnvironmentVariable('Path','User'); `
    + `$e=@(($u -split ';') | Where-Object { $_ }); `
    + `$k=@($e | ForEach-Object { [Environment]::ExpandEnvironmentVariables($_).TrimEnd('\\') }); `
    + `if ($k -notcontains $d.TrimEnd('\\')) { [Environment]::SetEnvironmentVariable('Path', (@($e) + $d) -join ';', 'User') }`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
  return r.status === 0;
}

export function removeAlias(alias, { home = homedir(), platform = process.platform } = {}) {
  if (!alias) return false;
  const path = shimPath(home, alias, platform);
  if (!ours(path)) return false;
  unlinkSync(path);
  return true;
}

export function aliasInBlock(text) {
  return text?.match(/I open you by typing `([a-z][a-z0-9-]*)`/)?.[1] ?? null;
}

// ------------------------------------------------------------ file ops ----

export function apply(opts, { home = homedir(), host = 'codex', dryRun = false, platform = process.platform, envPath = process.env.PATH } = {}) {
  const path = targetPath(home, host);
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
  // Build the block first, then place the launcher: a refused name or alias writes nothing.
  const after = merge(before, renderBlock(opts));
  const alias = opts.alias ? setAlias({ alias: opts.alias, name: opts.name, host }, { home, platform, envPath, dryRun }) : null;
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, after);
    // Renamed alias: the old launcher goes, so only one command opens it.
    const old = aliasInBlock(before);
    if (old && old !== opts.alias) removeAlias(old, { home, platform });
  }
  return { path, before, after, alias, created: before === null, replaced: before !== null && findStart(before) > -1 };
}

export function remove({ home = homedir(), host = 'codex', platform = process.platform } = {}) {
  const path = targetPath(home, host);
  if (!existsSync(path)) return { path, removed: false };
  const t = readFileSync(path, 'utf8');
  const s = findStart(t), e = t.indexOf(END);
  if (s < 0 || e < s) return { path, removed: false };
  const aliasRemoved = removeAlias(aliasInBlock(t.slice(s, e)), { home, platform });
  const out = (t.slice(0, s) + t.slice(e + END.length)).replace(/\n{3,}/g, '\n\n').trim();
  writeFileSync(path, out ? out + '\n' : '');
  return { path, removed: true, aliasRemoved };
}

export function show({ home = homedir(), host = 'codex' } = {}) {
  const path = targetPath(home, host);
  if (!existsSync(path)) return { path, block: null, alias: null };
  const t = readFileSync(path, 'utf8');
  const s = findStart(t), e = t.indexOf(END);
  const block = s > -1 && e > s ? t.slice(s, e + END.length) : null;
  return { path, block, alias: aliasInBlock(block) };
}

function pathFix(dir, platform) {
  if (platform === 'win32') return `In PowerShell: [Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';${dir}', 'User')   then open a new window.`;
  const rc = /zsh/.test(process.env.SHELL || '') ? '~/.zshrc' : '~/.bashrc';
  return `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ${rc}   then open a new terminal.`;
}

const real = (p) => { try { return realpathSync(p); } catch { return p; } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2);
  const arg = (f, d) => { const i = argv.indexOf(f); return i > -1 ? argv[i + 1] : d; };
  const has = (f) => argv.includes(f);
  const home = arg('--home', homedir());
  const host = arg('--host', 'codex');
  try {
    if (has('--show')) {
      const r = show({ home, host });
      console.log(r.block ? r.block : `no setup block in ${r.path}`);
      if (r.alias) console.log(`\nalias: ${r.alias} (${shimPath(home, r.alias)}${existsSync(shimPath(home, r.alias)) ? '' : ', launcher missing, re-run /setup'})`);
      process.exit(r.block ? 0 : 1);
    }
    if (has('--remove')) {
      const r = remove({ home, host });
      console.log(r.removed ? `removed setup block from ${r.path}${r.aliasRemoved ? ' and its launcher' : ''}` : `nothing to remove in ${r.path}`);
      process.exit(0);
    }
    const rawAlias = arg('--alias');
    const alias = rawAlias && rawAlias !== 'none' ? rawAlias.toLowerCase() : null;
    const r = apply({
      name: arg('--name'),
      lang: arg('--lang', 'english'),
      tone: arg('--tone', 'direct'),
      ask: (arg('--ask', 'delete,send,pay') || '').split(',').map((x) => x.trim()).filter(Boolean),
      memory: arg('--memory', 'on') !== 'off',
      alias,
    }, { home, host, dryRun: has('--dry-run') });
    const verb = has('--dry-run') ? 'WOULD WRITE' : (r.created ? 'CREATED' : r.replaced ? 'REPLACED' : 'APPENDED');
    console.log(`\x1b[32m${verb}\x1b[0m ${r.path}\n`);
    console.log(r.after.slice(findStart(r.after), r.after.indexOf(END) + END.length));
    if (r.alias) {
      console.log(`\n\x1b[32m${has('--dry-run') ? 'WOULD WRITE' : 'ALIAS'}\x1b[0m ${r.alias.path}`);
      if (r.alias.persisted) console.log(`added ${dirname(r.alias.path)} to your PATH for new windows`);
      else if (!r.alias.onPath) console.log(`\x1b[33mnot on PATH yet:\x1b[0m ${dirname(r.alias.path)}\n  ${pathFix(dirname(r.alias.path), process.platform)}`);
    }
    if (!has('--dry-run')) {
      const product = host === 'codex' ? 'Codex' : 'Claude Code';
      const open = r.alias ? `Open a new terminal, type ${alias} and press Enter.` : `Open a new ${product} session.`;
      console.log(`\n${open} The first reply starts with "${arg('--name')}:".`);
    }
  } catch (e) {
    console.error(`\x1b[31mNOT WRITTEN\x1b[0m ${e.message}`);
    process.exit(1);
  }
}
