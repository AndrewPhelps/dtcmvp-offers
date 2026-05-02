# peter's mac mini — nightly SWAG generation

Runs at 2am PT every night on this Mac Mini. Generates a batch of SWAG specs from the unscored portion of `1800dtc.db`, lints, reworks the worst with Opus, upserts to the droplet as drafts. Companion: a second machine on a different Claude account runs the same job at 9am. Together they target ~720 unscored partners.

## locations

| | |
|---|---|
| Script | `/Users/bill/scripts/swag-nightly/run.sh` (NOT in any git repo — lives on this Mac Mini only) |
| Per-run log dir | `/Users/bill/scripts/swag-nightly/logs/$TAG/` (TAG = `YYYY-MM-DD_HH-MM-SS`) |
| Per-agent prompts | `/Users/bill/scripts/swag-nightly/prompts/$TAG/` |
| Cron stderr fallback | `/Users/bill/scripts/swag-nightly/cron.log` |
| Crontab line | `0 2 * * * /Users/bill/scripts/swag-nightly/run.sh >> /Users/bill/scripts/swag-nightly/cron.log 2>&1` |

## pipeline

1. `curl /api/swag/admin/list` → set of slugs already in DB
2. `ssh deploy@droplet → docker exec ... 1800dtc.db` → full candidate list ordered by brand_count DESC
3. Filter: drop done slugs, drop hard-coded skip list (generic SaaS, dev tools, platform infra), drop `Best NN ...` directory entries and trailing-`*` suspicious entries
4. Take top `WAVE_SIZE * WAVES` (default 150) → batch
5. Generate one prompt file per slug → `/Users/bill/scripts/swag-nightly/prompts/$TAG/sonnet-$slug.txt`
6. Run `WAVES` sequential waves of `WAVE_SIZE` parallel `claude --print --model sonnet` agents → `/tmp/swag-batch-sonnet-$TAG/`
7. Lint specs (canonical labels, em-dash, double-hyphen, AI-speak)
8. Pick top `OPUS_REWORK_CAP` worst-scoring lint failures, regenerate with `--model opus` → `/tmp/swag-batch-opus-$TAG/`
9. Combine: copy sonnet specs to `/tmp/swag-batch-final-$TAG/`, then opus specs overwrite same-slug files
10. SCP to droplet, `docker cp` into `dtcmvp-offers-frontend`, `node /app/scripts/upsert-swag.js --batch`. Specs land as `status=draft` for review at https://offers.dtcmvp.com/admin/swags
11. Slack posts to channel C0A4HCHDKU2 tagging `<@U07BGPDCFP1>` at start + end

## env var knobs

| var | default | use |
|---|---|---|
| `WAVE_SIZE` | 30 | parallel agents per wave |
| `WAVES` | 5 | total waves (so default batch = 150 specs) |
| `OPUS_REWORK_CAP` | 25 | max specs reworked with Opus per night (caps Opus quota burn) |
| `NO_SLACK` | 0 | set to 1 to suppress Slack posts (testing) |
| `DRY_RUN` | 0 | set to 1 to print the batch and exit without launching agents |

Smoke test recipe: `NO_SLACK=1 WAVE_SIZE=2 WAVES=1 OPUS_REWORK_CAP=2 /Users/bill/scripts/swag-nightly/run.sh`

## yield expectations

- ~30-50% of candidates produce a spec; the rest get "skipped: not enough info" because the long tail of `1800dtc.db` includes generic SaaS, dev infra, and analytics tools that don't fit the SWAG framework
- 150-candidate batch typically yields 50-75 actual draft specs
- Quality (Sonnet vs Opus rework): ~20% of Sonnet specs pass lint cleanly; the rest get caught in the lint-fix sweep

## known gotchas

These bit the initial setup. Worth re-checking if the cron stops producing specs:

1. **Cron has minimal PATH.** `claude` lives at `/Users/bill/.local/bin/claude` which isn't in cron's default PATH. The script exports `PATH` at the top to fix this. Symptom: per-agent logs say `nohup: claude: No such file or directory` and waves complete in 0 seconds.
2. **Cron inherits launchctl's 256 fd soft limit.** Interactive shells have 1M; cron has 256. Each `claude --print` agent needs many fds, so 30 parallel agents blow past 256 immediately and exit with `error: An unknown error occurred, possibly due to low max file descriptors. Current limit: 256`. The script self-raises with `ulimit -n 65536` (hard limit is unlimited). Symptom in interactive testing: works fine. Symptom in cron: every agent log is exactly 254 bytes with the fd error and the run produces 0 specs but doesn't otherwise look broken.
3. **macOS bash is 3.2.** No `mapfile`, no associative arrays. The script uses `while read` loops instead. Symptom: `mapfile: command not found` early in step 4.
4. **Backgrounding inside `$(...)` orphans children.** Don't use a `launch_agent()` helper that backgrounds via `&` and echoes `$!`. The PID won't be a child of the calling shell, `wait $pid` returns immediately, and agents become orphans. Launch directly in the loop body. Symptom: waves complete in 0-1 seconds with running `claude --print` processes still in `ps`.
5. **`docker exec node -e` SSH escaping.** Use double-quoted SSH outer with single-quoted node inner. Avoid `!=""` literal comparisons in SQL through SSH; use `length(col)>0` instead. Symptom: `SqliteError: no such column: "" - should this be a string literal in single-quotes?`

## coordination with the 9am machine

No claim-based coordination. Both machines independently query `/api/swag/admin/list` at start. The 2am batch upserts by ~3am, well before the 9am machine queries. Worst case if 2am runs long: a few duplicate slugs get reprocessed; the upsert script overwrites the existing draft so no DB corruption.

## removing the cron when the list depletes

The script auto-detects an empty TODO and Slack-pings "list depleted, no work to do" then exits 0. Cron will keep firing nightly with that no-op result until you remove it. To remove:

```
crontab -e
# delete the SWAG line and the comment above it
```

The classification-swarm cron above it is unrelated — leave that alone.
