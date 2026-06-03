#!/bin/bash
# Manual deploy script — use this when GH Actions is blocked (billing, etc).
#
# What it does:
#   1. Builds with NEXT_PUBLIC_PROXY_URL baked in
#   2. Creates a temp worktree on gh-pages branch
#   3. Replaces gh-pages contents with new out/
#   4. Commits + pushes
#   5. Cleans up
#
# Run from the repo root: ./deploy-manual.sh

set -euo pipefail

PROXY_URL="https://k4rto-browser-proxy.kritolsin3.workers.dev"
WORKTREE_DIR="/tmp/k4rto-gh-pages-$$"
TEMP_BRANCH="deploy-temp-$$"

cd "$(dirname "$0")"

echo "=== 1/5 Building with NEXT_PUBLIC_PROXY_URL=${PROXY_URL} ==="
NEXT_PUBLIC_PROXY_URL="${PROXY_URL}" npm run build

if [ ! -d out ]; then
  echo "ERROR: out/ not generated" >&2
  exit 1
fi

echo "=== 2/5 Fetching gh-pages branch ==="
git fetch origin gh-pages

echo "=== 3/5 Setting up worktree at ${WORKTREE_DIR} ==="
git worktree add "${WORKTREE_DIR}" -b "${TEMP_BRANCH}" origin/gh-pages

echo "=== 4/5 Replacing contents and committing ==="
find "${WORKTREE_DIR}" -mindepth 1 -maxdepth 1 -not -name '.git' -exec rm -rf {} +
cp -r out/. "${WORKTREE_DIR}/"

cd "${WORKTREE_DIR}"
git add -A
MAIN_SHA=$(git -C "$(git rev-parse --show-toplevel)" rev-parse --short main)
if git diff --cached --quiet; then
  echo "No changes to deploy — gh-pages already up to date."
else
  git commit -m "Deploy ${MAIN_SHA} to gh-pages (manual)"
  git push origin "${TEMP_BRANCH}:gh-pages"
fi

echo "=== 5/5 Cleanup ==="
cd - >/dev/null
git worktree remove "${WORKTREE_DIR}"
git branch -D "${TEMP_BRANCH}" 2>/dev/null || true

echo "Done. Check https://k4rto.com/ in 30s-2min."
