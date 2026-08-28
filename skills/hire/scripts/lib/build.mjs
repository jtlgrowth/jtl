// Shared build path for plan.mjs and apply.mjs: same answers in, same writes out.
// Recomputed rather than passed as an artifact, so preview and apply can never drift.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Stage, applyOp, runGuards, render, expand, pointerGet, readJsonIf } from './core.mjs';

export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadAnswers(path) {
  const raw = path === '-' ? readFileSync(0, 'utf8') : readFileSync(expand(path), 'utf8');
  return JSON.parse(raw);
}

export function rosterMembers(config) {
  const spec = config.roster?.members;
  if (!spec) return [];
  const doc = readJsonIf(render(spec.path, config.vars));
  if (!doc) return [];
  const at = pointerGet(doc, spec.pointer);
  return Array.isArray(at) ? at : Object.keys(at ?? {});
}

export function rosterKeywords(config) {
  const spec = config.roster?.keywords;
  if (!spec) return {};
  const doc = readJsonIf(render(spec.path, config.vars));
  if (!doc) return {};
  const at = pointerGet(doc, spec.pointer) ?? {};
  return Object.fromEntries(Object.entries(at).map(([k, v]) => [k, [
    ...(v.keywords ?? []), ...(v.label ? [v.label] : []),
  ].join(' ').toLowerCase()]));
}

const STOP = new Set(['the', 'and', 'for', 'a', 'an', 'of', 'to', 'in', 'on', 'with', 'work']);
const toks = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9.+#]+/).filter((t) => t.length > 2 && !STOP.has(t)));

// Jaccard over keyword tokens. Crude on purpose: it only has to surface the two nearest
// seats for a human to judge "new seat, or expansion of that one?"
export function overlap(config, probe) {
  const p = toks(probe);
  return Object.entries(rosterKeywords(config))
    .map(([name, text]) => {
      const q = toks(text);
      const hits = [...p].filter((t) => q.has(t));
      const score = hits.length / Math.max(1, new Set([...p, ...q]).size);
      return { name, score, shared: hits.slice(0, 8) };
    })
    .sort((a, b) => b.score - a.score);
}

export function validate(config, a) {
  const errs = [];
  if (!a.name || !/^[a-z][a-z0-9-]*$/.test(a.name)) errs.push('name must be lowercase slug (a-z, 0-9, -)');
  if (config.departments?.length && !config.departments.includes(a.department))
    errs.push(`department "${a.department}" is not one of: ${config.departments.join(', ')}`);
  if (rosterMembers(config).includes(a.name)) errs.push(`"${a.name}" is already on the roster — /hire only adds new seats`);
  for (const field of config.requires ?? []) {
    const v = field.split('.').reduce((o, k) => (o == null ? o : o[k]), a);
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length))
      errs.push(`answer "${field}" is required and empty`);
  }
  return errs;
}

export function build(config, answers) {
  const errs = validate(config, answers);
  if (errs.length) return { errs };

  const vars = {
    ...config.vars,
    ...answers,
    Name: answers.display || (answers.name[0].toUpperCase() + answers.name.slice(1)),
    org: config.org ?? '',
    skillDir: SKILL_DIR,
    // Local date, not UTC — a hire stamped with yesterday's date because the operator
    // is east of Greenwich is a small lie in a permanent file.
    date: config.today ?? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
  };

  const stage = new Stage();
  const actions = [];
  const skipped = [];
  for (const s of config.surfaces) {
    if (s.when && !vars[s.when]) { skipped.push(`${s.id} (condition "${s.when}" not set)`); continue; }
    try {
      actions.push(applyOp(s, stage, vars, SKILL_DIR));
    } catch (e) {
      if (s.required === false) { skipped.push(`${s.id} — ${e.message}`); continue; }
      return { errs: [`REQUIRED surface ${e.message}`] };
    }
  }

  // line-insert preserves a file's hand-authored formatting, which is what you want in a
  // roster file someone reads — but it also means a bad anchor could splice a line into
  // the middle of a JSON structure. Every staged .json must still parse, or nothing ships.
  for (const [path, v] of stage.changed) {
    if (!path.endsWith('.json')) continue;
    try { JSON.parse(v.after); }
    catch (e) { return { errs: [`writing ${path} would produce invalid JSON: ${e.message}`] }; }
  }

  // A generated job doc that fails the org's own section standard is a doc nobody's
  // auditor will pass. Catch it here, not in the audit report.
  const jd = config.jobDoc;
  if (jd?.requiredSections?.length) {
    const target = actions.find((x) => x.id === jd.surface);
    if (target) {
      const text = (stage.read(target.path) ?? '').toLowerCase();
      const missing = jd.requiredSections.filter((s) => !text.includes(s.toLowerCase()));
      if (missing.length) return { errs: [`job doc is missing required sections: ${missing.join(', ')}`] };
    }
  }

  return { vars, stage, actions, skipped, guards: runGuards(config, stage, vars) };
}

export function printPreview(res, config) {
  console.log(`\n\x1b[1mWRITES\x1b[0m — ${res.stage.changed.length} file(s)\n`);
  for (const a of res.actions) console.log(`  ${a.action.padEnd(22)} ${a.path}   [${a.id}]`);
  if (res.skipped.length) {
    console.log(`\n\x1b[1mSKIPPED (optional)\x1b[0m`);
    for (const s of res.skipped) console.log(`  - ${s}`);
  }
  console.log(`\n\x1b[1mDIFF\x1b[0m`);
  for (const d of res.stage.diffs()) console.log('\n' + d);
  console.log(`\n\x1b[1mGUARDS\x1b[0m`);
  if (!res.guards.length) console.log('  (none declared)');
  for (const g of res.guards) {
    console.log(`  ${g.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${g.id} — ${g.detail}`);
    if (!g.ok && g.message) console.log(`        why it matters: ${g.message}`);
  }
  if (config.verify?.length) {
    console.log(`\n\x1b[1mWILL VERIFY WITH\x1b[0m`);
    for (const v of config.verify) console.log(`  $ ${render(v, res.vars)}`);
  }
}
