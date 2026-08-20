#!/usr/bin/env bash
#
# JTL AgentKit — convenience installer.
#
# This does NOT install Claude Code and does NOT fetch anything beyond this
# repo. It just runs the two `claude plugin` commands for you, non-interactively
# where that's possible, so terminal-comfortable users don't have to type them
# by hand inside Claude Code.
#
#   ./install.sh
#
set -euo pipefail

MARKETPLACE="jtlgrowth/agentkit"
PLUGIN="agentkit@agentkit"
DOCS_URL="https://claude.com/claude-code"

say()  { printf '%s\n' "$*"; }
info() { printf '==> %s\n' "$*"; }
err()  { printf 'error: %s\n' "$*" >&2; }

if ! command -v claude >/dev/null 2>&1; then
  err "Claude Code (the 'claude' command) was not found on this machine."
  say ""
  say "Install it first from:"
  say "  $DOCS_URL"
  say ""
  say "Then re-run this script, or paste these two lines inside Claude Code:"
  say "  /plugin marketplace add $MARKETPLACE"
  say "  /plugin install $PLUGIN"
  exit 1
fi

info "found claude CLI: $(command -v claude)"

info "adding marketplace: $MARKETPLACE"
if claude plugin marketplace add "$MARKETPLACE"; then
  say "  ok"
else
  err "could not add the marketplace automatically."
  say "Paste this inside Claude Code instead:"
  say "  /plugin marketplace add $MARKETPLACE"
  exit 1
fi

info "installing plugin: $PLUGIN"
if claude plugin install "$PLUGIN" -y; then
  say "  ok"
else
  err "could not install the plugin automatically."
  say "Paste this inside Claude Code instead:"
  say "  /plugin install $PLUGIN"
  exit 1
fi

say ""
say "Done. Open Claude Code and the kit is ready to use."
