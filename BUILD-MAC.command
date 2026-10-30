#!/bin/bash
# Local development only: no upload, account changes, or marketplace publication.
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not available. Install a compatible Node version listed in README.md."
  read -r -p "Press Enter to close. "
  exit 1
fi
node scripts/build-local.mjs
result=$?
echo ""
echo "Diagnostic and build logs are in the build-logs folder."
read -r -p "Press Enter to close. "
exit "$result"
