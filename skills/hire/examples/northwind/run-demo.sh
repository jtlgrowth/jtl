#!/usr/bin/env bash
# Runs the Northwind hire end to end in a throwaway copy. Nothing in this repo changes.
#
#   ./run-demo.sh            preview only
#   ./run-demo.sh --apply    preview, then write into the copy and verify
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$HERE/../../scripts"
WORK="$(mktemp -d)"
trap 'echo; echo "workspace: $WORK"' EXIT

cp -R "$HERE/hire.config.json" "$HERE/answers-tess.json" "$HERE/repo" "$WORK/"

echo "== discover + overlap check =="
node "$SCRIPTS/discover.mjs" --config "$WORK/hire.config.json" \
  --probe "partnership affiliate reseller co-marketing referral"

echo
echo "== preview (writes nothing) =="
node "$SCRIPTS/plan.mjs" --config "$WORK/hire.config.json" --answers "$WORK/answers-tess.json"

if [[ "${1:-}" == "--apply" ]]; then
  echo
  echo "== apply =="
  node "$SCRIPTS/apply.mjs" --config "$WORK/hire.config.json" --answers "$WORK/answers-tess.json" --confirm
  echo
  echo "== diff against the committed after/ state =="
  diff -r "$HERE/after" "$WORK/repo" && echo "identical to after/ — the committed result is reproducible"
fi
