# `hire.config.json`

One file describes your roster's shape. The skill has no idea what your org looks like
until it reads this, and it will not guess.

Looked for in this order: `./hire.config.json`, `./.hire.config.json`,
`~/.hire.config.json`. Override with `--config <path>`.

```jsonc
{
  "version": 1,
  "org": "Northwind Robotics",
  "departments": ["support", "docs", "growth"],   // [] or omitted = free-form
  "vars": { "root": "./repo" },                   // relative paths resolve against
                                                  // this config file's directory;
                                                  // "~" expands; "home" is provided
  "roster": { … },     // where existing members live: powers the overlap check
  "requires": [ … ],   // answer fields that must be present and non-empty
  "jobDoc": { … },     // the section standard the generated doc must satisfy
  "surfaces": [ … ],   // the writes
  "guards": [ … ],     // consistency checks run against staged content
  "verify": [ … ]      // shell commands run after a successful write
}
```

## `roster`

```jsonc
"roster": {
  "members":  { "path": "{{root}}/roster.json", "pointer": "/agents" },
  "keywords": { "path": "{{root}}/roster.json", "pointer": "/routes" }
}
```

`members` is an array of names, or an object whose keys are names. It powers the
already-hired check. `keywords` maps name → `{ label, keywords[] }` and powers
`discover.mjs --probe`. Both are optional; without `keywords` the overlap check reports
nothing, which makes question 3 unanswerable. Supply it if you can.

## `requires`

A list of answer fields, dotted paths allowed (`tools.allow`). Missing or empty means the
plan is refused with all problems listed at once.

## `jobDoc`

```jsonc
"jobDoc": {
  "surface": "job-doc",                                        // which surface id
  "requiredSections": ["Desk:", "Runtime:", "Job:", "Routed when", "Boundaries"]
}
```

Matched case-insensitively against the rendered text. If your org has an auditor that
enforces sections, put its exact list here, then the auditor can never fail on a doc this
skill wrote.

## `surfaces`

An ordered list. Each has an `id`, an `op`, and a `path`. `required: false` downgrades a
failure to a skip; `when: "<answerField>"` skips unless that answer is truthy.

### `file-from-template`

```jsonc
{ "id": "job-doc", "op": "file-from-template",
  "path": "{{root}}/docs/team/{{name}}.md", "template": "job-doc.md" }
```

Templates resolve against `skills/hire/templates/`. Refuses to overwrite an existing file
unless `"mode": "overwrite"`.

### `json-set`

```jsonc
{ "id": "roster-member", "op": "json-set",
  "path": "{{root}}/roster.json", "pointer": "/agents/-", "value": "{{name}}" }
```

RFC 6901 pointer; a trailing `/-` appends to an array. `value` may be any JSON structure
and is rendered recursively: a string that is exactly `"{{keywords}}"` resolves to the
array, not to a comma-joined string. Re-writes the whole file with `JSON.stringify(…, 2)`,
so **hand-formatted files lose their formatting**. Use `line-insert` for those.

### `line-insert`

```jsonc
{ "id": "readme-row", "op": "line-insert",
  "path": "{{root}}/README.md",
  "anchor": "^\\| [A-Z].* \\|",   // regex
  "last": true,                    // match the LAST anchor, not the first
  "position": "after",             // or "before"
  "skipIf": "^\\| {{Name}} \\|",   // already there → skip, don't duplicate
  "line": "| {{Name}} | {{owns}} | {{qa}} |" }
```

Preserves everything else in the file byte for byte. The inserted `line` may contain `\n`
to insert a block. A missing anchor is an error, not a silent no-op.

**Any staged `.json` file must still parse** after every surface has run, whichever op
produced it, so `line-insert` into JSON is safe to use for formatting-sensitive roster
files.

## `guards`

```jsonc
{ "id": "route-parity", "type": "set-equality",
  "a": { "path": "{{root}}/roster.json", "pointer": "/agents", "kind": "array" },
  "b": { "path": "{{root}}/roster.json", "pointer": "/routes", "kind": "keys" },
  "message": "an agent in /agents with no /routes entry breaks routing for the whole roster" }
```

`kind` is `array` or `keys`. Guards run against **staged** content, before anything is
written. A failing guard refuses the entire hire and prints `message`: write that message
for the person who will read it at 2am.

Use one wherever two structures must agree: a roster and its permission table, a member
list and its routing map, a member list and its model-routing table.

## `verify`

Shell commands, rendered with the answers, run after a successful write. Non-zero is
reported as FAIL: the files are already on disk at that point, so this is a report, not a
gate. Point it at whatever auditor your repo already has.

## Template variables

Everything in `vars`, everything in the answers file, plus:

| var | value |
| --- | --- |
| `{{Name}}` | `display`, or capitalised `name` |
| `{{date}}` | local date, `YYYY-MM-DD` |
| `{{org}}` | `config.org` |
| `{{home}}` | the user's home directory |

Filters: `{{x|sentence}}` (adds terminal punctuation if missing), `{{x|title}}`,
`{{x|lower}}`, `{{x|upper}}`. Arrays render comma-joined unless the placeholder is the
entire string.
