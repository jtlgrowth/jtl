#!/usr/bin/env node
// setup — give Codex or Claude Code a name and three standing rules.
// Idempotent: the block lives between two markers and is replaced in place. Anything
// outside the markers is never touched. No dependencies, Node 18+.
//
//   node setup.mjs --host codex --name Ana --lang taglish --tone direct --ask "delete,send,pay" [--memory on|off] [--home <dir>] [--dry-run]
//   node setup.mjs --host codex --show [--home <dir>]
//   node setup.mjs --host codex --remove [--home <dir>]

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

export const START = '<!-- setup:start — written by /setup, edit freely, re-run /setup to replace -->';
export const END = '<!-- setup:end -->';

const LANG = {
  english: 'Reply in plain English.',
  taglish: 'Reply in Taglish — English with Filipino where it is natural, the way people in a Manila office actually talk.',
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

export function renderBlock({ name, lang = 'english', tone = 'direct', ask = ['delete', 'send', 'pay'], memory = true }) {
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
    `- Start every reply with \`${name} —\` so I know these instructions are loaded.`,
    `- ${LANG[lang]} ${TONE[tone]}`,
  ];
  if (asks.length) lines.push(`- Ask me first before: ${asks.map((a) => ASK[a]).join('; ')}. Everything else, do it and tell me after.`);
  if (memory) lines.push(
    '- When I tell you a fact about my business (what I sell, prices, hours, how I talk, who my customers are), save it under "## About my business" in this file so you remember it next session. Keep that section short; rewrite, do not append forever.',
  );
  lines.push('', '## About my business', '', '(nothing saved yet)', END);
  return lines.join('\n') + '\n';
}

export function targetPath(home = homedir(), host = 'codex') {
  if (host === 'codex') return join(home, '.codex', 'AGENTS.md');
  if (host === 'claude') return join(home, '.claude', 'CLAUDE.md');
  throw new Error('--host must be one of: codex, claude');
}

export function merge(existing, block) {
  if (existing == null || existing === '') return block;
  const s = existing.indexOf(START), e = existing.indexOf(END);
  if (s > -1 && e > s) {
    // Keep whatever the user has saved under "## About my business" across re-runs.
    const old = existing.slice(s, e + END.length);
    const kept = old.match(/## About my business\n([\s\S]*?)\n<!-- setup:end -->/)?.[1]?.trim();
    let next = block;
    if (kept && kept !== '(nothing saved yet)') next = block.replace('(nothing saved yet)', kept);
    return existing.slice(0, s) + next.trimEnd() + existing.slice(e + END.length);
  }
  if (s > -1 || e > -1) throw new Error('found one setup marker without the other — fix ~/.claude/CLAUDE.md by hand');
  return existing.replace(/\s*$/, '\n\n') + block;
}

export function apply(opts, { home = homedir(), host = 'codex', dryRun = false } = {}) {
  const path = targetPath(home, host);
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
  const after = merge(before, renderBlock(opts));
  if (!dryRun) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, after); }
  return { path, before, after, created: before === null, replaced: before !== null && before.includes(START) };
}

export function remove({ home = homedir(), host = 'codex' } = {}) {
  const path = targetPath(home, host);
  if (!existsSync(path)) return { path, removed: false };
  const t = readFileSync(path, 'utf8');
  const s = t.indexOf(START), e = t.indexOf(END);
  if (s < 0 || e < s) return { path, removed: false };
  const out = (t.slice(0, s) + t.slice(e + END.length)).replace(/\n{3,}/g, '\n\n').trim();
  writeFileSync(path, out ? out + '\n' : '');
  return { path, removed: true };
}

export function show({ home = homedir(), host = 'codex' } = {}) {
  const path = targetPath(home, host);
  if (!existsSync(path)) return { path, block: null };
  const t = readFileSync(path, 'utf8');
  const s = t.indexOf(START), e = t.indexOf(END);
  return { path, block: s > -1 && e > s ? t.slice(s, e + END.length) : null };
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
      process.exit(r.block ? 0 : 1);
    }
    if (has('--remove')) {
      const r = remove({ home, host });
      console.log(r.removed ? `removed setup block from ${r.path}` : `nothing to remove in ${r.path}`);
      process.exit(0);
    }
    const r = apply({
      name: arg('--name'),
      lang: arg('--lang', 'english'),
      tone: arg('--tone', 'direct'),
      ask: (arg('--ask', 'delete,send,pay') || '').split(',').map((x) => x.trim()).filter(Boolean),
      memory: arg('--memory', 'on') !== 'off',
    }, { home, host, dryRun: has('--dry-run') });
    const verb = has('--dry-run') ? 'WOULD WRITE' : (r.created ? 'CREATED' : r.replaced ? 'REPLACED' : 'APPENDED');
    console.log(`\x1b[32m${verb}\x1b[0m ${r.path}\n`);
    console.log(r.after.slice(r.after.indexOf(START), r.after.indexOf(END) + END.length));
    if (!has('--dry-run')) {
      const product = host === 'codex' ? 'Codex' : 'Claude Code';
      console.log(`\nOpen a new ${product} session and the first reply starts with "${arg('--name')} —".`);
    }
  } catch (e) {
    console.error(`\x1b[31mNOT WRITTEN\x1b[0m ${e.message}`);
    process.exit(1);
  }
}
