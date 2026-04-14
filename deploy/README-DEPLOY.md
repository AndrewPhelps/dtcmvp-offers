# dtcmvp-offers deployment

Standalone marketplace frontend. Deployed to the DO droplet at `142.93.27.155` alongside dtcmvpete, brand-portal, cal-platform, and webhook-server-v2. Subdomain `offers.dtcmvp.com` (TLS via Let's Encrypt).

| Port | Container |
|---|---|
| 3005 → container 3000 | `dtcmvp-offers-frontend` |

Backend (`/api/offers/*`) lives in **dtcmvp-app** and is served by webhook-server-v2 at `webhooks.dtcmvp.com`. This frontend does not have its own backend.

---

## First-time setup (one-time manual, before first deploy.sh)

Peter/admin does these once. After this, `./deploy/deploy.sh` handles everything.

### 1. DNS
Add A record in Namecheap: `offers.dtcmvp.com` → `142.93.27.155`
Wait for propagation (~5 min): `dig +short offers.dtcmvp.com`

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

### 6. Install nginx site + SSL

```bash
# Root session:
ssh root@142.93.27.155

# Copy the nginx config into place
cp /home/deploy/dtcmvp-offers/deploy/nginx-dtcmvp-offers /etc/nginx/sites-available/dtcmvp-offers
ln -s /etc/nginx/sites-available/dtcmvp-offers /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Provision SSL (certbot will edit the nginx config in place and add HTTPS + redirect)
certbot --nginx -d offers.dtcmvp.com
```

Test public URL:

```bash
curl -I https://offers.dtcmvp.com/
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
    │ https://offers.dtcmvp.com
    ▼
DO droplet nginx (port 443)
    │ proxy_pass
    ▼
localhost:3005  →  dtcmvp-offers-frontend (Next.js 16 standalone)
                       │ fetch NEXT_PUBLIC_API_URL
                       ▼
                  https://webhooks.dtcmvp.com/api/offers/*
                       │
                       ▼
                  webhook-server-v2 container
                       │
                       ▼
                  handlers/offers (SQLite + Airtable)
```

---

*Last updated: 2026-04-13*
