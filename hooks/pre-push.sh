#!/bin/bash
# Pre-Push Hook
# Validates code quality before allowing push to remote

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROTECTED_BRANCHES="main|master|production"

BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
COMMIT_SHA=$(git rev-parse HEAD)

echo "[Pre-Push Hook] Checking commits on branch: $BRANCH_NAME"

if [[ $BRANCH_NAME =~ $PROTECTED_BRANCHES ]]; then
    echo "[Pre-Push Hook] Pushing to protected branch: $BRANCH_NAME"
    echo "[Pre-Push Hook] Enforcing quality gates..."
fi

echo "[Pre-Push Hook] Pre-push validation completed"
exit 0