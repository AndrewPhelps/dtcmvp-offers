#!/usr/bin/env bash
# Monthly 1800dtc scrape — intended to run via host cron on the DO droplet.
#
# What it does:
#   1. cd into this script's directory (the 1800dtc/ scraper)
#   2. git pull origin master on the offers repo so we have the latest
#      parser + schema
#   3. refresh the Python venv if requirements changed
#   4. point the scraper at the LIVE offers DB
#      (~/dtcmvp-offers/data/1800dtc.db), run `scraper.py monthly`
#   5. monthly itself copies live→working, scrapes, snapshots, diffs,
#      posts Slack digest, atomically swaps back into live
#
# Logs stream to scraper.log in this directory (tailable via `tail -f`).
# Cron errors bubble up via email/MAILTO if configured.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LIVE_DB="$REPO_ROOT/data/1800dtc.db"
VENV="$SCRIPT_DIR/.venv"
PY="$VENV/bin/python"

cd "$SCRIPT_DIR"

# Wrapper writes its own lifecycle events to cron.log; the Python process
# logs to scraper.log via its own FileHandler. We deliberately do NOT
# `tee` Python stdout into scraper.log — that'd duplicate every line.
WLOG="$SCRIPT_DIR/cron.log"
ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*" | tee -a "$WLOG"; }

log "=== run-monthly.sh starting ==="

# 1) Pull latest scraper code (repo has a read-only deploy key on the droplet)
cd "$REPO_ROOT"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git pull --ff-only origin master 2>&1 | tee -a "$WLOG" || log "git pull failed — continuing with existing checkout"
fi
cd "$SCRIPT_DIR"

# 2) Ensure venv exists + deps up-to-date
if [ ! -x "$PY" ]; then
    log "creating venv at $VENV"
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install --quiet --upgrade pip
fi
"$VENV/bin/pip" install --quiet -r requirements.txt 2>&1 | tee -a "$WLOG" || log "pip install had warnings"

# 3) Load Slack bot token (reuse the offers container's .env if present)
if [ -f "$REPO_ROOT/.env.production" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$REPO_ROOT/.env.production"
    set +a
fi
# Also inherit from shell env if SLACK_BOT_TOKEN was exported by the cron wrapper.
if [ -z "${SLACK_BOT_TOKEN:-}" ]; then
    log "WARN: SLACK_BOT_TOKEN not set — monthly will skip Slack digest"
fi

# 4) Run the scraper against the LIVE DB path. `monthly` copies to
#    1800dtc.next.db, scrapes, swaps back.
export SCRAPE_DB_PATH="$LIVE_DB"

log "scraper.py monthly starting (SCRAPE_DB_PATH=$SCRAPE_DB_PATH)"
# Python writes its own scraper.log via FileHandler; we just capture
# stdout to cron.log so a wrapper-only tail tells the story.
set +e
"$PY" scraper.py monthly "$@" >> "$WLOG" 2>&1
rc=$?
set -e

log "scraper.py monthly exited rc=$rc"

# 5) Bounce the offers container so its cached sqlite connection picks up
#    the new inode. (The app already has an mtime check but a clean restart
#    guarantees every worker sees the swap. ~5 sec of downtime on an
#    admin-only page that nobody hits at cron time.)
if [ "$rc" -eq 0 ] && command -v docker >/dev/null 2>&1; then
    log "restarting dtcmvp-offers-frontend to pick up swapped DB"
    (cd "$REPO_ROOT" && docker compose restart frontend 2>&1 | tee -a "$WLOG") || log "docker restart failed (non-fatal)"
fi

log "=== run-monthly.sh done rc=$rc ==="
exit "$rc"
