#!/usr/bin/env node
// hire/verify-roster — prove one name is on the roster, in both the member list and the
// route table. A script rather than an inline `node -e "..."` so the verify command has no
// quoting to get wrong under cmd.exe or PowerShell.
//
//   node verify-roster.mjs --name tess [--config path]

import { loadConfig, render, pointerGet, readJsonIf } from './lib/core.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const name = arg('--name');
if (!name) { console.error('verify-roster: --name is required'); process.exit(2); }

let config;
try { config = loadConfig(arg('--config')); }
catch (e) { console.error(`verify-roster: ${e.message.split('\n')[0]}`); process.exit(2); }

const spec = config.roster;
if (!spec?.members || !spec?.keywords) { console.log(`${name}: config declares no roster — nothing to verify`); process.exit(0); }

const members = readJsonIf(render(spec.members.path, config.vars));
const routes = readJsonIf(render(spec.keywords.path, config.vars));
const inMembers = (pointerGet(members, spec.members.pointer) ?? []).includes(name);
const inRoutes = !!(pointerGet(routes, spec.keywords.pointer) ?? {})[name];

if (inMembers && inRoutes) { console.log(`${name} present in members and routes`); process.exit(0); }
console.error(`${name} ${inMembers ? 'IS' : 'is NOT'} in members, ${inRoutes ? 'IS' : 'is NOT'} in routes`);
process.exit(1);
