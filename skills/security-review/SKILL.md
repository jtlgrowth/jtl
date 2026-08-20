---
name: security-review
description: Run a targeted static-pattern security review over a repo or diff — command injection via string execSync, TypeScript-cast bypasses on numeric input, unsafe npm install specs, loader-hijack env leakage into child processes, plaintext secrets at rest, and unbounded stdin. Use before merging code that spawns child processes, installs packages, handles untrusted numeric/string input, or persists credentials.
---

# security-review

A six-pattern checklist for the vulnerability classes that actually show up in agent
tooling and CLIs — not general OWASP boilerplate. Each class names what to grep for and
what the fix looks like. Run this on new/changed code before merge, especially anything
that shells out, installs packages, or touches secrets.

## 1. `execSync(string)` command injection

**Grep for:** `execSync(` where the argument is a template literal or string
concatenation (backticks or `+` with a variable inside).

**Why it matters:** shell interpolation means any variable that reaches the string can
break out with `;`, `&&`, backticks, etc.

**Fix:** replace with `execFileSync(cmd, argv, { shell: false })` — pass the command and
its arguments as a separate array, never as one interpolated string. If the command must
go through a shell (pipes, globs), validate/escape every interpolated segment first and
document why a shell was unavoidable.

## 2. TypeScript numeric casts bypassed by string payloads

**Grep for:** `as number`, `: number` type annotations on values sourced from external
input (CLI args, MCP tool calls, JSON bodies, env vars) with no runtime check.

**Why it matters:** TypeScript casts are erased at compile time. A field typed `number`
can still hold the runtime string `"1; rm -rf /"` if it came from JSON or a CLI flag and
was never actually validated.

**Fix:** add a runtime guard — a `toPositiveInt(value)` helper (or equivalent) that
parses, range-checks, and throws/rejects on anything that isn't a clean integer, called
at the boundary where the value enters the system, not just where it's declared.

## 3. Unvalidated package specs before `npm install`

**Grep for:** any `npm install`, `execFileSync('npm', ['install', ...])`, or similar
where the package name/version comes from user input, a config file, or a remote source.

**Why it matters:** an unvalidated package spec is a second injection surface even after
switching to `execFileSync` — `foo@$(rm -rf /)`-shaped strings, scoped-package tricks,
or arbitrary git/tarball URLs standing in for a registry name.

**Fix:** gate every install with a regex/allowlist check (a `isSafePackageSpec(pkg,
version)`-style function) before it reaches the install call — defense in depth even
when the spawn itself is already argv-safe.

## 4. Loader-hijack env vars leaking into child processes

**Grep for:** places that build a child process `env` by spreading `process.env` (or an
untrusted config object) without stripping `LD_PRELOAD`, `NODE_OPTIONS`, or `DYLD_*`
(macOS) keys.

**Why it matters:** any of these env vars can force arbitrary code to load inside the
child process, silently, regardless of what the child process itself does.

**Fix:** scrub these keys explicitly before constructing the child's `env` — a
`validateEnv()`-style function that strips or rejects the loader-hijack variables (and
any other injection vector specific to your platform) before the spawn call.

## 5. Plaintext secrets at rest

**Grep for:** files that persist tokens, API keys, session state, or credentials as
plain JSON/SQLite/text with no encryption — session stores, terminal-output caches,
memory/DB blobs.

**Why it matters:** anything written to disk in plaintext is one filesystem read (backup
leak, misconfigured permissions, shared machine) away from full compromise.

**Fix:** support opt-in at-rest encryption for anything holding secrets — encrypt on
write with a fresh IV per write, decrypt on read, fail loudly (not silently) on a
tampered/corrupted blob rather than producing garbage output. Sniff on read so a
migration to encrypted storage doesn't break existing plaintext files mid-rollout.

## 6. Unbounded stdin / input size

**Grep for:** any process reading stdin, a socket, or an uploaded payload into memory
without an explicit size cap.

**Why it matters:** an unbounded read is a trivial DoS vector — a caller (or a malicious
MCP client, or a compromised upstream) can pipe unlimited bytes and exhaust memory.

**Fix:** enforce an explicit buffer/size cap at the read boundary and reject (not
silently truncate) input over the limit, with the limit stated somewhere reviewable
(config or a constant), not buried in a library default.

## The severity-ranking trap

When a scanner assigns severities (critical/high/medium/low) to findings, check what
happens when a finding has **no assigned severity** — `undefined`, `null`, or an unmapped
string. If the fail-on-severity gate does a comparison like `severity >= 'high'`, an
`undefined` severity can silently fail that comparison and pass the gate instead of
blocking it. Treat missing/unrecognized severity as the *worst* case for gating purposes,
never as a pass-through — and add a test that plants a finding with no severity field to
confirm the gate actually blocks it.

---

Adapted from ruflo (github.com/ruvnet/ruflo) security-audit plugin documentation, MIT.
