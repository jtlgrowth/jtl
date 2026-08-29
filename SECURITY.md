# Security Policy

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/jtlgrowth/securitymaxx/security/advisories/new)
on this repository. Please do not open a public issue for anything exploitable.

Expect a first reply within 72 hours.

## What is in scope

This repository ships Markdown instructions and static HTML templates. There is no server,
no database, and no runtime that accepts input from strangers. The realistic risk surface
is therefore narrow, and these are the things worth reporting:

- **Prompt injection in the skill text.** `SKILL.md` and everything under `references/` is
  executable prompt code, not documentation. If a phrasing can be steered into making an
  agent take a destructive action, exfiltrate a secret, or audit a system it was not
  pointed at, that is a real vulnerability. Report it.
- **A template that leaks what it was told to redact.** The scorecard is meant to name
  `file:line` and redact values. A template path that renders a secret verbatim is a bug
  with real consequences, because these reports get shared.
- **Anything in a template that makes an outbound request.** They are supposed to be fully
  self-contained. A remote font, script, or image would send the report's contents, often
  a security audit of a private system, to a third party.

## What is out of scope

- Findings that securitymaxx misses or misjudges on your codebase. That is accuracy, not a
  vulnerability: open a normal issue, ideally with the case that fooled it.
- Vulnerabilities in the applications you audit with it.
- The fictional demo scorecards under `skills/securitymaxx/assets/`. The insecure ones are
  insecure deliberately; that is what they are demonstrating.

## Using this tool responsibly

securitymaxx is for systems you own or have written authorization to test. It is read-only
and its live probes are ordinary HTTP requests, but pointing any audit tool at a stranger's
infrastructure is still your call and your liability, not the tool's.
