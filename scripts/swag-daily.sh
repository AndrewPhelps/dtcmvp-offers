#!/bin/bash
# swag-daily.sh - daily SWAG generation pipeline.
# Pulls candidates from 1800dtc.db, generates SWAG specs via parallel Sonnet agents,
# lints output, upserts to offers DO instance. Self-evicts when candidate list is dry.
#
# Env overrides for testing:
#   SWAG_BATCH_SIZE=2 SWAG_BATCHES_PER_RUN=1 SWAG_DRY_RUN=1 ./swag-daily.sh

set -uo pipefail

# Bash-native timeout: run_with_timeout SECONDS COMMAND [ARGS...]
# Returns 124 on timeout, command's rc otherwise.
run_with_timeout() {
    local timeout_sec=$1; shift
    "$@" &
    local cmd_pid=$!
    ( sleep "$timeout_sec" && kill -TERM "$cmd_pid" 2>/dev/null && sleep 5 && kill -KILL "$cmd_pid" 2>/dev/null ) &
    local watchdog_pid=$!
    wait "$cmd_pid" 2>/dev/null
    local rc=$?
    kill -TERM "$watchdog_pid" 2>/dev/null
    wait "$watchdog_pid" 2>/dev/null
    return $rc
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_FILE="$SCRIPT_DIR/swag-skip.json"
LINT_SCRIPT="$SCRIPT_DIR/lint-batch.py"
PLIST_PATH="$HOME/Library/LaunchAgents/com.dtcmvp.swag-daily.plist"
LOG_DIR="$HOME/Library/Logs/dtcmvp-swag"

BATCH_SIZE=${SWAG_BATCH_SIZE:-30}
BATCHES_PER_RUN=${SWAG_BATCHES_PER_RUN:-5}
ORCHESTRATOR_BUDGET=${SWAG_ORCHESTRATOR_BUDGET:-25}
ORCHESTRATOR_TIMEOUT=${SWAG_ORCHESTRATOR_TIMEOUT:-1800}
DRY_RUN=${SWAG_DRY_RUN:-0}

DATE_TAG=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/swag-daily-$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "=========================================="
echo "swag-daily started: $(date)"
echo "  batch_size=$BATCH_SIZE batches_per_run=$BATCHES_PER_RUN dry_run=$DRY_RUN"
echo "=========================================="

LOCK_DIR="/tmp/swag-daily.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "ERROR: previous run still active (lock $LOCK_DIR exists). Exiting."
    exit 1
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

echo ""
echo "[1] Pulling existing slugs from offers API..."
EXISTING=$(curl -s --max-time 30 https://offers.dtcmvp.com/api/swag/admin/list | jq -r '.specs[].slug' | sort -u)
if [[ -z "$EXISTING" ]]; then
    echo "ERROR: failed to pull existing slugs"
    exit 1
fi
EXISTING_COUNT=$(echo "$EXISTING" | wc -l | tr -d ' ')
echo "    existing in offers DB: $EXISTING_COUNT"

echo ""
echo "[2] Pulling candidates from 1800dtc.db..."
CANDIDATES_JSON=$(ssh -o ConnectTimeout=15 -o BatchMode=yes dtcmvp-infra "docker exec dtcmvp-offers-frontend node -e 'const Database = require(\"better-sqlite3\"); const db = new Database(\"/app/data/1800dtc.db\", {readonly: true}); const rows = db.prepare(\"SELECT slug, name, website_url, brand_count FROM apps ORDER BY COALESCE(brand_count, 0) DESC, COALESCE(review_count, 0) DESC\").all(); console.log(JSON.stringify(rows));'")
if [[ -z "$CANDIDATES_JSON" ]] || ! echo "$CANDIDATES_JSON" | jq empty 2>/dev/null; then
    echo "ERROR: failed to pull candidates"
    exit 1
fi
TOTAL_CANDIDATES=$(echo "$CANDIDATES_JSON" | jq 'length')
echo "    total candidates: $TOTAL_CANDIDATES"

SKIP_SLUGS=$(jq -r '.[]' "$SKIP_FILE" 2>/dev/null | sort -u)
EXCLUDE=$(printf '%s\n%s\n' "$EXISTING" "$SKIP_SLUGS" | sort -u | grep -v '^$' | jq -R . | jq -s .)
REMAINING=$(echo "$CANDIDATES_JSON" | jq --argjson exclude "$EXCLUDE" '[.[] | select(.slug as $s | $exclude | index($s) | not)]')
TOTAL_REMAINING=$(echo "$REMAINING" | jq 'length')
echo "    remaining (after dedup + skip): $TOTAL_REMAINING"

if [[ "$TOTAL_REMAINING" -eq 0 ]]; then
    echo ""
    echo "[3] List is dry. Removing LaunchAgent."
    if [[ "$DRY_RUN" -eq 0 ]]; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        rm -f "$PLIST_PATH"
        echo "    LaunchAgent removed: $PLIST_PATH"
    else
        echo "    (dry-run: would remove $PLIST_PATH)"
    fi
    echo ""
    echo "swag-daily complete: list drained"
    exit 0
fi

TO_PROCESS=$(( BATCH_SIZE * BATCHES_PER_RUN ))
[[ "$TOTAL_REMAINING" -lt "$TO_PROCESS" ]] && TO_PROCESS=$TOTAL_REMAINING
echo ""
echo "[3] Will process $TO_PROCESS partners across up to $BATCHES_PER_RUN batches"

TOTAL_GENERATED=0
TOTAL_SKIPPED_BY_AGENTS=0
TOTAL_UPSERTED=0
TOTAL_FAILED=0

for batch_num in $(seq 1 $BATCHES_PER_RUN); do
    BATCH_START=$(( (batch_num - 1) * BATCH_SIZE ))
    BATCH_END=$(( BATCH_START + BATCH_SIZE ))
    BATCH=$(echo "$REMAINING" | jq ".[$BATCH_START:$BATCH_END]")
    BATCH_COUNT=$(echo "$BATCH" | jq 'length')

    if [[ "$BATCH_COUNT" -eq 0 ]]; then
        echo "  batch $batch_num: empty, stopping"
        break
    fi

    BATCH_TAG="$DATE_TAG-b$batch_num"
    BATCH_DIR="/tmp/swag-batch-$BATCH_TAG"
    META_DIR="/tmp/swag-batch-$BATCH_TAG-meta"
    rm -rf "$BATCH_DIR" "$META_DIR"
    mkdir -p "$BATCH_DIR" "$META_DIR"
    MANIFEST="$META_DIR/manifest.jsonl"

    echo ""
    echo "--- Batch $batch_num ($BATCH_COUNT partners, tag=$BATCH_TAG) ---"

    echo "  resolving redirects..."
    > "$MANIFEST"
    echo "$BATCH" | jq -c '.[]' | while read -r row; do
        slug=$(echo "$row" | jq -r '.slug')
        name=$(echo "$row" | jq -r '.name')
        raw_url=$(echo "$row" | jq -r '.website_url // ""')
        if [[ -n "$raw_url" ]]; then
            resolved=$(curl -sLI -m 15 -o /dev/null -w '%{url_effective}' "$raw_url" 2>/dev/null || echo "$raw_url")
            clean_url="${resolved%%\?*}"
        else
            clean_url=""
        fi
        jq -nc --arg slug "$slug" --arg name "$name" --arg url "$clean_url" \
            '{slug: $slug, name: $name, url: $url}' >> "$MANIFEST"
    done
    echo "    manifest: $(wc -l < "$MANIFEST" | tr -d ' ') entries"

    ORCHESTRATOR_PROMPT=$(cat <<PROMPT_EOF
You are running a SWAG generation batch in headless mode. Read the manifest at $MANIFEST. Each line is JSON with slug, name, url.

For EACH entry in the manifest, spawn ONE Agent in PARALLEL (single message, multiple Agent tool calls) using model "sonnet" and this exact per-agent prompt template (substitute {SLUG}, {NAME}, {URL}):

PER-AGENT PROMPT START

Generate a SWAG spec for {NAME}.

URL: {URL}
Slug: {SLUG}
partnerName (exact, no parens or .com suffix): {NAME}
Output path: $BATCH_DIR/{SLUG}.json

Read the skill at /Users/seanwendt/Documents/admin/.claude/skills/generate-swag/SKILL.md before starting. Reference fixtures at /Users/seanwendt/Documents/admin/dtcmvp-offers/src/partners/aftersell.json, klaviyo.json, gorgias.json.

Constraints:
- Use ONLY canonical benefit labels: CVR Lift, AOV Lift, Repeat Rate Lift, LTV Lift, Cart Recovery, Upsell Revenue, Subscription Revenue, Attributed Revenue, Winback Revenue, Retention Revenue, List Growth Revenue, Ad Revenue, Organic Revenue, Flow Optimization, Ticket Deflection, Return Prevention, ROAS Improvement, Fee Avoidance, Shipping Optimization, Tool Consolidation, Workflow Automation
- Channel-in-parens (e.g. "(Email)", "(SMS)") is ONLY allowed on "Attributed Revenue"
- Use ONLY canonical category names: Apparel & Fashion, Beauty & Cosmetics, Health & Wellness, Sports & Fitness, Food & Drink, Home & Electronics, Baby & Kids, Pet & Vet, Other
- NO em-dashes, en-dashes, or double-hyphens in any prose. NO AI-speak (leverage, robust, seamless, delve, moreover, crucial, vital, unlock, empower, meticulous, tapestry, comprehensive, cutting-edge, state-of-the-art, utilize). Write plain English.
- Err on the side of generating a spec, not skipping. Only skip if the partner is clearly not a real product (broken redirect to a different vendor, directory listing as the partner name).

Ship the JSON. One-line confirmation when done.

PER-AGENT PROMPT END

Fire ALL agents in ONE message with parallel Agent tool calls. After all complete, report:
WRITTEN: <number>
SKIPPED: <number>

Then exit. Do not do additional work.
PROMPT_EOF
)

    echo "  spawning $BATCH_COUNT sonnet agents via claude -p (budget cap \$$ORCHESTRATOR_BUDGET, timeout ${ORCHESTRATOR_TIMEOUT}s)..."
    ORCHESTRATOR_LOG="$META_DIR/orchestrator.log"
    SECONDS=0
    run_with_timeout "$ORCHESTRATOR_TIMEOUT" \
        claude -p \
            --model sonnet \
            --permission-mode bypassPermissions \
            --no-session-persistence \
            --max-budget-usd "$ORCHESTRATOR_BUDGET" \
            --output-format text \
            "$ORCHESTRATOR_PROMPT" > "$ORCHESTRATOR_LOG" 2>&1
    ORCHESTRATOR_RC=$?
    ELAPSED=$SECONDS
    if [[ $ORCHESTRATOR_RC -ne 0 ]]; then
        echo "  WARN: orchestrator exited rc=$ORCHESTRATOR_RC after ${ELAPSED}s (timeout or error)"
    else
        echo "  orchestrator finished in ${ELAPSED}s"
    fi

    WRITTEN=$(ls "$BATCH_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
    SKIPPED=$(( BATCH_COUNT - WRITTEN ))
    echo "  agents complete: $WRITTEN written, $SKIPPED skipped"

    if [[ "$WRITTEN" -gt 0 ]]; then
        echo "  linting..."
        python3 "$LINT_SCRIPT" "$BATCH_DIR" || echo "  WARN: lint reported issues (review JSON)"

        if [[ "$DRY_RUN" -eq 1 ]]; then
            echo "  (dry-run: skipping upsert)"
            UPSERTED=0
            FAILED=0
        else
            echo "  upserting via dtcmvp-infra..."
            ssh dtcmvp-infra "rm -rf /tmp/swag-batch-$BATCH_TAG && mkdir -p /tmp/swag-batch-$BATCH_TAG"
            scp "$BATCH_DIR"/*.json dtcmvp-infra:/tmp/swag-batch-$BATCH_TAG/ 2>&1 | tail -3
            UPSERT_OUT=$(ssh dtcmvp-infra "docker exec --user root dtcmvp-offers-frontend rm -rf /tmp/swag-batch-$BATCH_TAG && \
                docker cp /tmp/swag-batch-$BATCH_TAG dtcmvp-offers-frontend:/tmp/swag-batch-$BATCH_TAG && \
                docker exec --user root dtcmvp-offers-frontend chmod -R a+rx /tmp/swag-batch-$BATCH_TAG && \
                docker exec dtcmvp-offers-frontend node /app/scripts/upsert-swag.js --batch /tmp/swag-batch-$BATCH_TAG")
            echo "$UPSERT_OUT" | sed 's/^/    /'
            UPSERTED=$(echo "$UPSERT_OUT" | grep -c "^upserted:" || echo 0)
            FAILED=$(echo "$UPSERT_OUT" | grep -c "^failed:" || echo 0)
        fi
        TOTAL_UPSERTED=$(( TOTAL_UPSERTED + UPSERTED ))
        TOTAL_FAILED=$(( TOTAL_FAILED + FAILED ))
    fi

    TOTAL_GENERATED=$(( TOTAL_GENERATED + WRITTEN ))
    TOTAL_SKIPPED_BY_AGENTS=$(( TOTAL_SKIPPED_BY_AGENTS + SKIPPED ))
done

echo ""
echo "[4] Daily run complete"
echo "    generated: $TOTAL_GENERATED"
echo "    skipped (by agents): $TOTAL_SKIPPED_BY_AGENTS"
echo "    upserted: $TOTAL_UPSERTED"
echo "    failed (upsert): $TOTAL_FAILED"
echo ""
echo "swag-daily finished: $(date)"
