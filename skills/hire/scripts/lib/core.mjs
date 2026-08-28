// hire — shared core. No dependencies, Node 18+.
//
// Three write operations cover every roster surface anyone has:
//   file-from-template   create a file from a template
//   json-set             set a JSON Pointer (a pointer ending in /- appends)
//   line-insert          insert a rendered line at a regex anchor, formatting preserved
//
// Everything else — member arrays, keyword tables, a bullet in a governing doc — is one
// of those three pointed at a different path.

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve, join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

export const HOME = homedir();

export function expand(p) {
  if (!p) return p;
  return p.startsWith('~') ? join(HOME, p.slice(1)) : p;
}

// One canonical spelling per file. Config paths are built by string concatenation
// ("{{root}}/roster.json"), so on Windows they come out with mixed separators -
// C:\repo\path/roster.json - while path.join elsewhere produces backslashes. Keying
// the staging map on the raw string then puts ONE file under TWO keys, and the second
// surface to touch it reads the original from disk instead of the staged edit,
// silently dropping the first change. Every path is normalised before use.
export function norm(p) {
  return resolve(expand(p));
}

// ---------------------------------------------------------------- templating

// {{a}} and {{a.b}}. Unknown keys are left intact so a half-rendered template is
// visible rather than silently blank.
const FILTERS = {
  // Answers arrive as fragments ("recommends terms, never countersigns them"). When a
  // template joins two of them into one paragraph, the seam needs punctuation or the
  // generated doc reads as one run-on sentence.
  sentence: (s) => (s && !/[.!?:]$/.test(s.trim()) ? s.trim() + '.' : s.trim()),
  lower: (s) => s.toLowerCase(),
  upper: (s) => s.toUpperCase(),
  title: (s) => s.charAt(0).toUpperCase() + s.slice(1),
  // json is handled before flattening — see render()
};

export function render(str, vars) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{([\w.]+)(?:\|(\w+))?\}\}/g, (whole, path, filter) => {
    const val = path.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);
    if (val === undefined || val === null) return whole;
    // json sees the raw value; the rest see the flattened string.
    if (filter === 'json') return JSON.stringify(val);
    const flat = Array.isArray(val) ? val.join(', ') : String(val);
    const fn = filter ? FILTERS[filter] : null;
    if (filter && !fn) throw new Error(`unknown template filter "${filter}" in ${whole}`);
    return fn ? fn(flat) : flat;
  });
}

// Render through a whole structure. A string that is exactly "{{key}}" resolves to the
// raw value, so an array stays an array instead of becoming "a, b, c".
export function deepRender(node, vars) {
  if (typeof node === 'string') {
    const exact = node.match(/^\{\{([\w.]+)\}\}$/);
    if (exact) {
      const val = exact[1].split('.').reduce((o, k) => (o == null ? o : o[k]), vars);
      return val === undefined ? node : val;
    }
    return render(node, vars);
  }
  if (Array.isArray(node)) return node.map((n) => deepRender(n, vars));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [render(k, vars), deepRender(v, vars)]));
  }
  return node;
}

// ---------------------------------------------------------------- json pointer

function unescape(tok) { return tok.replace(/~1/g, '/').replace(/~0/g, '~'); }

export function pointerGet(doc, pointer) {
  if (!pointer || pointer === '/') return doc;
  let cur = doc;
  for (const raw of pointer.split('/').slice(1)) {
    if (cur == null) return undefined;
    cur = cur[unescape(raw)];
  }
  return cur;
}

// Sets pointer to value. A final "-" appends to an array (RFC 6902 semantics).
// Returns { changed, reason }.
export function pointerSet(doc, pointer, value) {
  const toks = pointer.split('/').slice(1).map(unescape);
  const last = toks.pop();
  let cur = doc;
  for (const t of toks) {
    if (cur[t] === undefined) cur[t] = {};
    cur = cur[t];
  }
  if (last === '-') {
    if (!Array.isArray(cur)) throw new Error(`pointer ${pointer} appends to a non-array`);
    if (cur.includes(value)) return { changed: false, reason: 'already present' };
    cur.push(value);
    return { changed: true };
  }
  if (JSON.stringify(cur[last]) === JSON.stringify(value)) return { changed: false, reason: 'already identical' };
  const existed = cur[last] !== undefined;
  cur[last] = value;
  return { changed: true, reason: existed ? 'replaced' : 'added' };
}

// ---------------------------------------------------------------- diff

// Minimal LCS line diff. Roster files are tens to hundreds of lines; O(n*m) is free
// here and it keeps the dependency count at zero.
export function unifiedDiff(before, after, path, context = 3) {
  const a = before === null ? [] : before.split('\n');
  const b = after.split('\n');
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push([' ', a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', a[i]]); i++; }
    else { ops.push(['+', b[j]]); j++; }
  }
  while (i < n) ops.push(['-', a[i++]]);
  while (j < m) ops.push(['+', b[j++]]);

  const keep = new Set();
  ops.forEach(([k], idx) => {
    if (k === ' ') return;
    for (let d = -context; d <= context; d++) if (ops[idx + d]) keep.add(idx + d);
  });
  if (!keep.size) return null;

  const out = [`--- ${path}${before === null ? ' (new file)' : ''}`, `+++ ${path}`];
  let last = -99;
  for (let idx = 0; idx < ops.length; idx++) {
    if (!keep.has(idx)) continue;
    if (idx > last + 1) out.push('  @@');
    out.push(`  ${ops[idx][0]} ${ops[idx][1]}`);
    last = idx;
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- staging

// Every write lands in a staging map first. Nothing touches disk until every write is
// computed, every guard passes, and the operator confirms — so a hire that would be
// half-applied is never applied at all.
export class Stage {
  constructor() { this.files = new Map(); this.notes = []; }

  read(path) {
    const key = norm(path);
    if (this.files.has(key)) return this.files.get(key).after;
    return existsSync(key) ? readFileSync(key, 'utf8') : null;
  }

  original(path) {
    const key = norm(path);
    if (this.files.has(key)) return this.files.get(key).before;
    return existsSync(key) ? readFileSync(key, 'utf8') : null;
  }

  write(path, text) {
    const key = norm(path);
    const before = this.files.has(key) ? this.files.get(key).before : this.original(key);
    this.files.set(key, { before, after: text });
  }

  get changed() {
    return [...this.files.entries()].filter(([, v]) => v.before !== v.after);
  }

  diffs() {
    return this.changed.map(([p, v]) => unifiedDiff(v.before, v.after, p)).filter(Boolean);
  }

  // All-or-nothing. If any write throws, everything already written is restored.
  commit() {
    const done = [];
    try {
      for (const [path, v] of this.changed) {
        mkdirSync(dirname(path), { recursive: true });
        done.push([path, v.before]);
        writeFileSync(path, v.after);
      }
      return done.map(([p]) => p);
    } catch (err) {
      for (const [path, before] of done.reverse()) {
        if (before === null) { try { unlinkSync(path); } catch {} }
        else writeFileSync(path, before);
      }
      throw new Error(`write failed, all changes rolled back: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------- operations

export function applyOp(surface, stage, vars, skillDir) {
  const op = surface.op;
  const path = norm(render(surface.path, vars));

  if (op === 'file-from-template') {
    if (stage.original(path) !== null && surface.mode !== 'overwrite')
      throw new Error(`${surface.id}: ${path} already exists — refusing to overwrite an existing file`);
    const tpl = readFileSync(resolve(skillDir, 'templates', surface.template), 'utf8');
    stage.write(path, render(tpl, vars));
    return { id: surface.id, path, action: 'create' };
  }

  if (op === 'json-set') {
    const raw = stage.read(path);
    if (raw === null) throw new Error(`${surface.id}: ${path} does not exist`);
    let doc;
    try { doc = JSON.parse(raw); }
    catch (e) { throw new Error(`${surface.id}: ${path} is not valid JSON (${e.message})`); }
    const pointer = render(surface.pointer, vars);
    const res = pointerSet(doc, pointer, deepRender(surface.value, vars));
    stage.write(path, JSON.stringify(doc, null, surface.indent ?? 2) + '\n');
    return { id: surface.id, path, action: res.changed ? `set ${pointer}` : `skip (${res.reason})` };
  }

  if (op === 'line-insert') {
    const raw = stage.read(path);
    if (raw === null) throw new Error(`${surface.id}: ${path} does not exist`);
    const line = render(surface.line, vars);
    const skipIf = surface.skipIf ? new RegExp(render(surface.skipIf, vars)) : null;
    if (skipIf && skipIf.test(raw)) return { id: surface.id, path, action: 'skip (already present)' };
    // Match the file's existing line endings. Splicing an LF-only line into a CRLF file
    // leaves mixed endings, which shows up as a whole-file diff on the next commit.
    const crlf = raw.includes('\r\n');
    const lines = raw.split('\n');
    const anchor = new RegExp(render(surface.anchor, vars));
    const bare = (l) => l.replace(/\r$/, '');
    const hit = surface.last
      ? lines.map((l, i) => [bare(l), i]).filter(([l]) => anchor.test(l)).pop()?.[1]
      : lines.findIndex((l) => anchor.test(bare(l)));
    if (hit === undefined || hit < 0)
      throw new Error(`${surface.id}: anchor /${surface.anchor}/ not found in ${path}`);
    // split('\n') on CRLF text leaves a trailing \r on every element, so an inserted
    // element has to carry one too — including each line of a multi-line insert.
    const eolMatched = crlf
      ? line.split('\n').map((l) => l.replace(/\r$/, '') + '\r').join('\n')
      : line;
    lines.splice(surface.position === 'before' ? hit : hit + 1, 0, eolMatched);
    stage.write(path, lines.join('\n'));
    return { id: surface.id, path, action: `insert at line ${hit + 1}` };
  }

  throw new Error(`${surface.id}: unknown op "${op}"`);
}

// ---------------------------------------------------------------- guards

// Guards read the STAGED content, so a violation is caught before anything is written
// rather than discovered by a dispatcher at 3am.
export function runGuards(config, stage, vars) {
  const results = [];
  for (const g of config.guards ?? []) {
    if (g.type !== 'set-equality') { results.push({ id: g.id, ok: false, detail: `unknown guard type ${g.type}` }); continue; }
    const side = (spec) => {
      const p = norm(render(spec.path, vars));
      const raw = stage.read(p);
      if (raw === null) return { err: `${p} missing` };
      let doc; try { doc = JSON.parse(raw); } catch (e) { return { err: `${p} invalid JSON` }; }
      const at = pointerGet(doc, render(spec.pointer, vars));
      if (at === undefined) return { err: `${p}${spec.pointer} missing` };
      return { set: new Set(spec.kind === 'keys' ? Object.keys(at) : at) };
    };
    const A = side(g.a), B = side(g.b);
    if (A.err || B.err) { results.push({ id: g.id, ok: false, detail: A.err || B.err, message: g.message }); continue; }
    const onlyA = [...A.set].filter((x) => !B.set.has(x));
    const onlyB = [...B.set].filter((x) => !A.set.has(x));
    results.push({
      id: g.id,
      ok: !onlyA.length && !onlyB.length,
      detail: onlyA.length || onlyB.length
        ? `only in a: [${onlyA.join(', ')}] · only in b: [${onlyB.join(', ')}]`
        : `${A.set.size} entries, exact match`,
      message: g.message,
    });
  }
  return results;
}

// ---------------------------------------------------------------- config

export function loadConfig(explicit, cwd = process.cwd()) {
  const candidates = explicit
    ? [expand(explicit)]
    : [join(cwd, 'hire.config.json'), join(cwd, '.hire.config.json'), join(HOME, '.hire.config.json')];
  for (const c of candidates) {
    if (existsSync(c)) {
      const cfg = JSON.parse(readFileSync(c, 'utf8'));
      cfg.__path = c;
      cfg.vars = { home: HOME, ...(cfg.vars ?? {}) };
      // Relative vars resolve against the config file's own directory, so a config that
      // ships inside a repo works wherever that repo is checked out.
      for (const [k, v] of Object.entries(cfg.vars)) {
        const val = expand(render(String(v), { home: HOME }));
        cfg.vars[k] = k === 'home' || isAbsolute(val) ? val : resolve(dirname(c), val);
      }
      return cfg;
    }
  }
  throw new Error(`no hire config found. Looked in:\n  ${candidates.join('\n  ')}\nCopy skills/hire/examples/northwind/hire.config.json and edit it.`);
}

export function readJsonIf(path) {
  const p = expand(path);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}
