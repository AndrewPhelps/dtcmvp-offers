# dtcmvp-offers deployment

Standalone marketplace frontend. Deployed to the DO droplet at `142.93.27.155` alongside dtcmvpete, brand-portal, cal-platform, and webhook-server-v2. Subdomain `partners.dtcmvp.com` (TLS via Let's Encrypt; ZeroSSL is a working fallback — see SSL section below).

| Port | Container |
|---|---|
| 3005 → container 3000 | `dtcmvp-offers-frontend` |

Backend (`/api/listings/*`) lives in **dtcmvp-app** (`handlers/listings/`) and is served by webhook-server-v2 at `webhooks.dtcmvp.com`. This frontend does not have its own backend.

### Domain history

| Subdomain | Live span |
|---|---|
| `offers.dtcmvp.com` | initial release through 2026-05-07 |
| `swags.dtcmvp.com` | 2026-05-07 (same-day rename, never publicly advertised) |
| `partners.dtcmvp.com` | 2026-05-08 onward (current) |

The old A records were removed when the subdomain moved; no live 301 redirects from old subdomains exist. Old `/offers/*` and `/swags/*` path prefixes 301 to root paths via middleware.

---

## First-time setup (one-time manual, before first deploy.sh)

Peter/admin does these once. After this, `./deploy/deploy.sh` handles everything.

### 1. DNS
Add A record in Namecheap: `partners.dtcmvp.com` → `142.93.27.155`
Wait for propagation (~5 min): `dig +short partners.dtcmvp.com`

### 2. GitHub deploy key for the droplet
The droplet needs read-only SSH access to this repo so it can `git pull`.

```bash
# On droplet (as deploy user):
ssh deploy@142.93.27.155
ssh-keygen -t ed25519 -C "deploy@dtcmvp-offers" -f ~/.ssh/github_dtcmvp_offers -N ""
cat ~/.ssh/github_dtcmvp_offers.pub
```

Copy the public key → GitHub repo Settings → Deploy keys → Add deploy key (Read-only, DO NOT check "Allow write access").

Add SSH host alias so the clone URL is unambiguous:

```bash
# Still on droplet, append to ~/.ssh/config:
cat >> ~/.ssh/config <<'EOF'

Host github.com-dtcmvp-offers
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_dtcmvp_offers
    IdentitiesOnly yes
EOF

# Test:
ssh -T github.com-dtcmvp-offers
# → "Hi AndrewPhelps/dtcmvp-offers! You've successfully authenticated..."
```

### 3. Clone the repo on the droplet

```bash
# On droplet as deploy:
cd ~
git clone git@github.com-dtcmvp-offers:AndrewPhelps/dtcmvp-offers.git
cd dtcmvp-offers
```

### 4. Populate `.env.production`

```bash
cp .env.production.example .env.production
```

As of 2026-04-14 the example is usable as-is on production — no secrets, only public URLs. Adjust only if you want to point at different backends (e.g. for local dev). Auth follows dtcmvp-2.0's proxy pattern: the frontend hits `api.dtcmvpete.com` which wraps Supabase server-side; no anon key in the browser.

### 5. First build

```bash
docker compose up -d --build
# Verify localhost:
curl -I http://127.0.0.1:3005/
```

### 6. Install nginx vhost + SSL

The `deploy` user has a narrow NOPASSWD sudo allowlist that only permits `cp /tmp/nginx-staging-*` → `/etc/nginx/sites-available/staging-*`. So vhost files installed via this path end up named `staging-dtcmvp-partners` even though they're production — confusing but functional (nginx doesn't care about filenames). When you have a root session, `sudo mv` it to a clean name. Until then:

```bash
# As deploy:
ssh deploy@142.93.27.155
cat > /tmp/nginx-staging-dtcmvp-partners <<'EOF'
server {
    server_name partners.dtcmvp.com;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
EOF
sudo /bin/cp /tmp/nginx-staging-dtcmvp-partners /etc/nginx/sites-available/staging-dtcmvp-partners
sudo /bin/ln -sf /etc/nginx/sites-available/staging-dtcmvp-partners /etc/nginx/sites-enabled/staging-dtcmvp-partners
sudo /usr/sbin/nginx -t && sudo /usr/sbin/nginx -s reload
```

Then provision SSL (certbot edits the vhost in place to add `listen 443 ssl` + HTTP→HTTPS redirect):

**Primary path — Let's Encrypt:**

```bash
sudo /usr/bin/certbot --nginx -d partners.dtcmvp.com \
  --non-interactive --agree-tos --email peter@peterdanieljames.com --redirect
```

**Fallback — ZeroSSL** (use when LE has an outage; both speak ACME and the cert is interchangeable):

```bash
# Get free EAB credentials by email (no signup needed):
curl -s -X POST 'https://api.zerossl.com/acme/eab-credentials-email' \
  --data-urlencode 'email=peter@peterdanieljames.com'
# → {"success":true,"eab_kid":"...","eab_hmac_key":"..."}

# Plug those into certbot:
sudo /usr/bin/certbot \
  --server https://acme.zerossl.com/v2/DV90 \
  --eab-kid '<KID>' --eab-hmac-key '<HMAC>' \
  --nginx -d partners.dtcmvp.com \
  --non-interactive --agree-tos --email peter@peterdanieljames.com --redirect
```

Either path's cert auto-renews via certbot's systemd timer / cron. The `partners.dtcmvp.com` cert was issued via ZeroSSL on 2026-05-08 because of a multi-hour LE outage; renewal continues against the same CA.

Test public URL:

```bash
curl -I https://partners.dtcmvp.com/
```

---

## Ongoing deploys

From your local MacBook checkout:

```bash
# make changes, commit, push first — deploy.sh refuses if you haven't
git add . && git commit -m "..." && git push origin master

./deploy/deploy.sh             # pull + rebuild + restart (~1-3 min)
./deploy/deploy.sh --restart   # just restart containers (5 sec)
./deploy/deploy.sh --logs      # tail production logs
```

`deploy.sh` preflight refuses if local has uncommitted/unpushed changes OR if the droplet's working tree is dirty. Fix those before deploying — never run destructive git commands on the droplet to "clean up" drift (see root CLAUDE.md "Never edit code directly on remote production servers").

---

## `/admin/scrape-results` admin viewer — scrape DB sync

The admin-only `/admin/scrape-results` page reads from `/app/data/1800dtc.db` inside
the container, which is bind-mounted from `~/dtcmvp-offers/data/` on the host.
The DB is gitignored (~300 MB) so it ships out-of-band.

**First time per droplet OR whenever the scrape is rerun:**

```bash
# From local MacBook:
ssh deploy@142.93.27.155 'mkdir -p ~/dtcmvp-offers/data'
scp /Users/peter/Documents/GitHub/dtcmvp-offers/1800dtc/1800dtc.db \
    deploy@142.93.27.155:~/dtcmvp-offers/data/1800dtc.db

# Then redeploy so the container picks up the new mount target (if it's
# the first time — subsequent updates just overwrite the file in place,
# no restart needed; SQLite is opened read-only on first request).
./deploy/deploy.sh
```

If the file isn't present, `/admin/scrape-results` renders a clear error
("Couldn't open the scrape database") with the expected path.

### Monthly auto-refresh (host cron)

`1800dtc/run-monthly.sh` runs as a droplet-level cron on the 1st of each
month. It re-scrapes everything, snapshots into `scrape_snapshots`, diffs
against last month, posts a Slack digest, and atomically swaps the new DB
into place. ~14 minutes single-threaded; low-impact at 04:00 UTC.

**One-time setup on the droplet:**

```bash
ssh deploy@142.93.27.155
cd ~/dtcmvp-offers/1800dtc

# Python venv + deps (the wrapper script auto-creates these on first run,
# but doing it manually the first time lets you verify):
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Add Slack token to .env.production at the repo root so the wrapper picks
# it up (or export SLACK_BOT_TOKEN in the cron line below). Without it the
# monthly run still happens but the Slack digest is skipped.
echo "SLACK_BOT_TOKEN=xoxb-..." >> ~/dtcmvp-offers/.env.production

# Dry-run end-to-end to confirm everything wires up before setting the cron:
./run-monthly.sh --dry-run
# ^ expect: "dry-run: skipping atomic swap + Slack post" and a digest printed.

# Install the cron (runs 04:00 UTC on the 1st of every month):
crontab -l 2>/dev/null > /tmp/ct && echo "0 4 1 * * /home/deploy/dtcmvp-offers/1800dtc/run-monthly.sh >> /home/deploy/dtcmvp-offers/1800dtc/cron.log 2>&1" >> /tmp/ct && crontab /tmp/ct
```

**Monitoring:**
- `tail -f ~/dtcmvp-offers/1800dtc/scraper.log` — detailed run log
- `tail -f ~/dtcmvp-offers/1800dtc/cron.log` — cron wrapper stdout/stderr
- Slack `#dtcmvp-mvc` — monthly digest with NEW / VERIFIED_TRUE / CASE_STUDY_ADDED / BRAND_COUNT_JUMP events

**Run on-demand:**

```bash
ssh deploy@142.93.27.155 '~/dtcmvp-offers/1800dtc/run-monthly.sh'
# or dry-run only (no swap, no Slack):
ssh deploy@142.93.27.155 '~/dtcmvp-offers/1800dtc/run-monthly.sh --dry-run'
```

---

## Staging environments (TODO)

The droplet has a shared staging-infra at `~/staging-infra/` that lets any branch deploy to `{slug}.staging.dtcmvp.com`. Adding dtcmvp-offers to that setup:

1. Add entry to `~/staging-infra/apps.json` (name, build context, env file, health path)
2. Create `~/staging-infra/templates/dtcmvp-offers/docker-compose.staging.yml`
3. Add `--staging` flag handling to this repo's deploy.sh (follow dtcmvp-2.0's pattern)
4. Wildcard DNS `*.staging.dtcmvp.com → 142.93.27.155` already exists

Deferred until the standalone production deploy is stable.

---

## Architecture cheatsheet

```
User's browser
    │ https://partners.dtcmvp.com
    ▼
DO droplet nginx (port 443)
    │ proxy_pass
    ▼
localhost:3005  →  dtcmvp-offers-frontend (Next.js 16 standalone)
                       │ fetch NEXT_PUBLIC_API_URL
                       ▼
                  https://webhooks.dtcmvp.com/api/listings/*
                       │
                       ▼
                  webhook-server-v2 container
                       │
                       ▼
                  handlers/listings (SQLite + Airtable)
```

---

*Last updated: 2026-05-11*
