#!/bin/bash
# dtcmvp-offers deploy script
# Git-pull based. SSHs to the DO droplet, pulls origin/master, rebuilds the
# frontend container. Run from your MacBook — never on the droplet directly.
#
# Usage:
#   ./deploy/deploy.sh            # full build + restart
#   ./deploy/deploy.sh --restart  # just restart containers, no rebuild
#   ./deploy/deploy.sh --logs     # tail logs after deploy
#
# First-time setup on the droplet (one-time manual steps, see README-DEPLOY.md):
#   - ssh deploy@142.93.27.155
#   - git clone git@github.com-dtcmvp-offers:AndrewPhelps/dtcmvp-offers.git ~/dtcmvp-offers
#   - cp .env.production.example .env.production && vim .env.production

set -e

DROPLET_USER="deploy"
DROPLET_IP="142.93.27.155"
DROPLET_PATH="~/dtcmvp-offers"
SSH_TARGET="$DROPLET_USER@$DROPLET_IP"
BRANCH="master"
MODE="${1:-full}"

# Append a structured line to ~/staging-infra/logs/events.log on DO for a
# shared audit trail. Non-fatal: logging failures never abort a deploy.
log_remote() {
    ssh "$SSH_TARGET" "DEPLOY_AGENT_ID='${DEPLOY_AGENT_ID:-$(whoami)-manual}' bash -lc 'source ~/staging-infra/lib-log.sh 2>/dev/null && log_event $*'" 2>/dev/null || true
}

COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
trap 'log_remote dtcmvp-offers deploy-failed production mode=$MODE commit=$COMMIT' ERR

echo "==================================="
echo "dtcmvp-offers deploy"
echo "  mode:   $MODE"
echo "  branch: $BRANCH"
echo "  target: $SSH_TARGET:$DROPLET_PATH"
echo "==================================="

# ── preflight: local repo must be clean and pushed ──
preflight_local() {
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        echo "ERROR: not in a git repository"
        exit 1
    fi
    if ! git diff-index --quiet HEAD --; then
        echo "ERROR: local working tree has uncommitted changes."
        echo "Commit, stash, or revert before deploying:"
        git status --short
        exit 1
    fi
    git fetch origin "$BRANCH" --quiet
    AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo "0")
    if [ "$AHEAD" -gt "0" ]; then
        echo "ERROR: local has $AHEAD unpushed commit(s):"
        git log --oneline "origin/$BRANCH..HEAD"
        echo ""
        echo "Push first:  git push origin $BRANCH"
        exit 1
    fi
    if [ "$BEHIND" -gt "0" ]; then
        echo "Note: local is $BEHIND commit(s) behind origin/$BRANCH — deploying origin/$BRANCH."
    fi
}

# ── preflight: droplet repo must not have modified tracked files ──
preflight_do() {
    echo ""
    echo "Checking droplet state..."
    MODIFIED=$(ssh "$SSH_TARGET" "cd $DROPLET_PATH && git status --porcelain | grep -v '^??' | wc -l")
    UNTRACKED=$(ssh "$SSH_TARGET" "cd $DROPLET_PATH && git status --porcelain | grep '^??' | wc -l")
    DO_BRANCH=$(ssh "$SSH_TARGET" "cd $DROPLET_PATH && git rev-parse --abbrev-ref HEAD")
    HEAD=$(ssh "$SSH_TARGET" "cd $DROPLET_PATH && git rev-parse --short HEAD")
    echo "  branch:    $DO_BRANCH"
    echo "  HEAD:      $HEAD"
    echo "  modified:  $MODIFIED tracked file(s)"
    echo "  untracked: $UNTRACKED file(s)"
    if [ "$MODIFIED" != "0" ]; then
        echo ""
        echo "ERROR: droplet has $MODIFIED modified tracked file(s) — git pull would overwrite them."
        echo "  ssh $SSH_TARGET 'cd $DROPLET_PATH && git status'"
        exit 1
    fi
    if [ "$DO_BRANCH" != "$BRANCH" ]; then
        echo ""
        echo "ERROR: droplet is on branch '$DO_BRANCH', not '$BRANCH'."
        echo "  ssh $SSH_TARGET 'cd $DROPLET_PATH && git checkout $BRANCH'"
        exit 1
    fi
}

# --restart skips preflight + rebuild
if [ "$MODE" == "--restart" ]; then
    echo ""
    echo "Restart only (no pull, no rebuild)..."
    ssh "$SSH_TARGET" "cd $DROPLET_PATH && docker compose restart"
    echo "Done."
    exit 0
fi

if [ "$MODE" == "--logs" ]; then
    ssh "$SSH_TARGET" "cd $DROPLET_PATH && docker compose logs --tail=100 -f"
    exit 0
fi

preflight_local
preflight_do

log_remote dtcmvp-offers deploy-start production mode=$MODE branch=$BRANCH commit=$COMMIT

# ── pull + build + restart ──
echo ""
echo "[1/3] Pulling latest code on droplet..."
ssh "$SSH_TARGET" "cd $DROPLET_PATH && git pull origin $BRANCH"

echo ""
echo "[2/3] Building and starting container..."
ssh "$SSH_TARGET" "cd $DROPLET_PATH && docker compose up -d --build"

echo ""
echo "[3/3] Verifying deployment..."
sleep 4
HEALTH=$(ssh "$SSH_TARGET" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3005/ || echo ERR")
echo "  http://127.0.0.1:3005/ → $HEALTH"

PUBLIC=$(curl -s -o /dev/null -w '%{http_code}' https://offers.dtcmvp.com/ || echo ERR)
echo "  https://offers.dtcmvp.com/ → $PUBLIC"

echo ""
echo "=== deploy complete ==="
log_remote dtcmvp-offers deploy-complete production mode=$MODE commit=$COMMIT
trap - ERR
