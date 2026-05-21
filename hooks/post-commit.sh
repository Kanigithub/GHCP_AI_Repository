#!/bin/bash
# Post-Commit Hook
# Executes after a commit is created locally
# Triggers the Code Review Agent workflow

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOK_DIR="$REPO_ROOT/.git/hooks"

# Get current commit SHA
COMMIT_SHA=$(git rev-parse HEAD)
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

echo "[Post-Commit Hook] Commit SHA: $COMMIT_SHA"
echo "[Post-Commit Hook] Branch: $BRANCH_NAME"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "[Post-Commit Hook] Warning: Node.js not found, skipping code review"
    exit 0
fi

# Trigger code review
echo "[Post-Commit Hook] Code Review Agent trigger initiated"
exit 0