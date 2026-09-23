# Deployment Guide — Quran Tutor Platform

**A complete, copy-paste guide to putting this app on the internet using DigitalOcean.**

Written for someone who has never deployed a Django + React app before. Every command is explained.

---

## Part 0 — Is DigitalOcean a good choice?

**Yes. For this project it is one of the best choices.** Here is the honest comparison:

| Host | Cost/month | Difficulty | Good for you? |
|------|-----------|------------|---------------|
| **DigitalOcean Droplet** | $12 | Medium — you manage the server | ✅ **Recommended** |
| DigitalOcean App Platform | $17–29 | Easy — DO manages the server | ✅ Good if you hate servers |
| AWS / Google Cloud | $20–40 | Hard — 50 services to choose from | ❌ Overkill for now |
| Heroku | $25+ | Easy | 🟡 Expensive, no free tier anymore |
| Railway / Render | $10–20 | Easy | 🟡 Fine, but less control |
| Shared cPanel hosting | $5 | Painful for Django | ❌ Avoid |

### Why DigitalOcean

- **Predictable price.** $12 is $12. AWS can surprise you with a $200 bill.
- **Excellent documentation.** Their Django tutorials are genuinely good.
- **Simple dashboard.** Not 200 confusing menus.
- **Everything in one place.** Server, database, file storage, DNS, backups.
- **Data centres in Bangalore and Singapore** — low latency for Pakistan/Middle East users.

### Droplet vs App Platform — which one?

**Droplet** = an empty Linux computer in a data centre. You install everything yourself. More work, more control, cheaper, and **you learn how servers actually work**.

**App Platform** = you connect your GitHub repo, DO builds and runs it for you. Less work, less control, ~$10/month more.

**My recommendation for you: start with a Droplet.** You said you want to understand DevOps. A Droplet teaches you in one weekend what App Platform hides forever. And if you hate it, moving to App Platform later takes an afternoon.

### Your monthly cost

| Item | Cost | Needed at launch? |
|------|------|-------------------|
| Droplet, 2 GB RAM / 1 vCPU / 50 GB SSD | **$12/mo** | ✅ Yes |
| Domain name (Namecheap, GoDaddy) | ~$1/mo ($12/year) | ✅ Yes |
| SSL certificate (Let's Encrypt) | **Free** | ✅ Yes |
| DO Managed PostgreSQL | $15/mo | ❌ Later — run Postgres on the Droplet for now |
| DO Spaces (image storage) | $5/mo | ❌ Later — local disk is fine at first |
| Droplet backups | $2.40/mo | 🟡 Strongly recommended |

**Total to launch: about $13–15/month.**

> ⚠️ **Do not pick the $6 / 1 GB droplet.** Django + PostgreSQL + Redis + an nginx build will run out of memory, and `npm run build` will be killed halfway through. The $12 / 2 GB is the realistic minimum.

---

## Part 1 — Code changes you MUST make before deploying

Do these **on your laptop first**, test them, and commit them. Do not do them for the first time on the live server.

### 1.1 Add production settings

Open `backend/quran_platform/quran_platform/settings.py`.

**Add `STATIC_ROOT`** (find the `STATIC_URL` line and add below it):

```python
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')   # <-- ADD THIS

MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

**Turn on WhiteNoise** (it serves static files without extra nginx config). In `MIDDLEWARE`, add it directly after `SecurityMiddleware`:

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # <-- ADD THIS
    'django.contrib.sessions.middleware.SessionMiddleware',
    ...
]

# And at the bottom of the file:
STORAGES = {
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
}
```

**Lock down CORS.** Replace `CORS_ALLOW_ALL_ORIGINS = True` with:

```python
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=Csv())
    CSRF_TRUSTED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=Csv())
```

**Add security settings** at the bottom of the file:

```python
# Production hardening - only switches on when DEBUG is False
if not DEBUG:
    SECURE_SSL_REDIRECT = True                  # force https
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000              # tell browsers "always https"
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
```

### 1.2 Fix the bugs from ROADMAP.md section 3

Do not skip this. The Stripe webhook bug in particular means **money can be taken without your database knowing**.

### 1.3 Create the frontend production env file

Create `frontend/.env.production`:

```
VITE_API_URL=https://yourdomain.com/api
```

Vite reads this automatically when you run `npm run build`.

### 1.4 Generate a real secret key

Never use the development key in production. Generate one:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Save the output — you will paste it into the server's `.env`.

### 1.5 Check what you are about to make public

```bash
cd backend/quran_platform
python manage.py check --deploy
```

This prints every security problem Django can find. Fix the warnings it shows.

### 1.6 Commit and push

```bash
git add -A
git commit -m "Add production settings and fix pre-deploy bugs"
git push origin feat/tech-courses
```

---

## Part 2 — Create the server

### 2.1 Make a Droplet

1. Sign up at [digitalocean.com](https://digitalocean.com)
2. **Create → Droplets**
3. Region: **Bangalore** or **Singapore** (closest to Pakistan)
4. Image: **Ubuntu 24.04 LTS**
5. Size: **Basic → Regular → $12/mo (2 GB / 1 CPU)**
6. Authentication: **SSH Key** (much safer than a password — DO shows you how to add one)
7. Hostname: `quran-platform`
8. Tick **Enable backups** (+$2.40/mo, worth it)
9. **Create Droplet**

You now have an IP address, e.g. `165.22.xxx.xxx`.

### 2.2 Point your domain at it

In your domain registrar's DNS settings:

| Type | Host | Value |
|------|------|-------|
| A | `@` | `165.22.xxx.xxx` |
| A | `www` | `165.22.xxx.xxx` |

DNS takes 5 minutes to 2 hours to spread worldwide. Carry on with the next steps while you wait.

### 2.3 Log in and make it safe

```bash
ssh root@165.22.xxx.xxx
```

**Never run the app as `root`.** Create a normal user:

```bash
adduser noman                    # it will ask for a password - remember it
usermod -aG sudo noman           # let this user run admin commands
rsync --archive --chown=noman:noman ~/.ssh /home/noman
```

Turn on the firewall — only ports 22 (SSH), 80 (http) and 443 (https) open:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

Log out and log back in as the new user:

```bash
exit
ssh noman@165.22.xxx.xxx
```

### 2.4 Install everything

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y python3-pip python3-dev python3-venv \
                    libpq-dev postgresql postgresql-contrib \
                    nginx redis-server git curl

# Node 20 for building the React app
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Check the versions
python3 --version    # should be 3.12.x
node --version       # should be v20.x
psql --version       # should be 16.x
```

### 2.5 Create the database

```bash
sudo -u postgres psql
```

Inside the `postgres=#` prompt, type these one by one (**use your own strong password**):

```sql
CREATE DATABASE learning_system;
CREATE USER quranuser WITH PASSWORD 'PUT_A_STRONG_PASSWORD_HERE';

ALTER ROLE quranuser SET client_encoding TO 'utf8';
ALTER ROLE quranuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE quranuser SET timezone TO 'UTC';

GRANT ALL PRIVILEGES ON DATABASE learning_system TO quranuser;
\c learning_system
GRANT ALL ON SCHEMA public TO quranuser;
\q
```

> The last two lines matter on PostgreSQL 15+. Without them Django cannot create tables, and you get a confusing `permission denied for schema public` error.

---

## Part 3 — Put the app on the server

### 3.1 Get the code

```bash
cd /home/noman
git clone https://github.com/HafizNomi/YOUR-REPO-NAME.git app
cd app
git checkout feat/tech-courses
```

If the repo is private, GitHub will ask for a token — create one at
GitHub → Settings → Developer settings → Personal access tokens.

### 3.2 Python environment

```bash
cd /home/noman/app/backend/quran_platform
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

This takes 2–3 minutes.

### 3.3 Create the production `.env`

```bash
nano /home/noman/app/backend/quran_platform/.env
```

Paste this, replacing every `CHANGE_ME`:

```ini
# --- Django ---
DJANGO_SECRET_KEY=CHANGE_ME_paste_the_key_you_generated_earlier
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,165.22.xxx.xxx

# --- Database ---
DB_NAME=learning_system
DB_USER=quranuser
DB_PASSWORD=CHANGE_ME_the_postgres_password_you_chose
DB_HOST=localhost
DB_PORT=5432

# --- CORS: which websites may call this API ---
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# --- Email (Gmail app password, or SendGrid/Mailgun) ---
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=CHANGE_ME_gmail_app_password
DEFAULT_FROM_EMAIL=Quran Tutor <no-reply@yourdomain.com>

# --- Where the React app lives (used in email links) ---
FRONTEND_URL=https://yourdomain.com
PASSWORD_RESET_TIMEOUT=86400

# --- Redis (for Celery later) ---
REDIS_URL=redis://localhost:6379/0

# --- Stripe (leave blank until Phase 2) ---
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# --- Daily.co (leave blank until Phase 3) ---
DAILY_API_KEY=
```

Save with `Ctrl+O`, `Enter`, then `Ctrl+X`.

Lock the file down so only you can read it:

```bash
chmod 600 .env
```

> **Gmail note:** a normal Gmail password will not work. Turn on 2-factor auth, then create an **App Password** at myaccount.google.com → Security → App passwords.

### 3.4 Set up the database and static files

```bash
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser        # this is your admin login
```

### 3.5 Test that Gunicorn can run it

```bash
gunicorn --bind 0.0.0.0:8000 quran_platform.wsgi
```

Open `http://165.22.xxx.xxx:8000/admin/` in a browser. It will look unstyled — that is expected right now. If you see the Django login form, it works. Press `Ctrl+C` to stop.

---

## Part 4 — Run it permanently with systemd

Gunicorn must restart automatically if it crashes or the server reboots. That is what systemd does.

### 4.1 The socket

```bash
sudo nano /etc/systemd/system/gunicorn.socket
```

```ini
[Unit]
Description=gunicorn socket

[Socket]
ListenStream=/run/gunicorn.sock

[Install]
WantedBy=sockets.target
```

### 4.2 The service

```bash
sudo nano /etc/systemd/system/gunicorn.service
```

```ini
[Unit]
Description=gunicorn daemon for Quran Platform
Requires=gunicorn.socket
After=network.target

[Service]
User=noman
Group=www-data
WorkingDirectory=/home/noman/app/backend/quran_platform
ExecStart=/home/noman/app/backend/quran_platform/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --timeout 60 \
          --bind unix:/run/gunicorn.sock \
          quran_platform.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

> **How many workers?** The rule is `(2 × CPU cores) + 1`. A 1-vCPU droplet → 3 workers.

### 4.3 Start it

```bash
sudo systemctl daemon-reload
sudo systemctl start gunicorn.socket
sudo systemctl enable gunicorn.socket
sudo systemctl status gunicorn.socket      # should say "active (listening)"
```

---

## Part 5 — Build the React app

```bash
cd /home/noman/app/frontend
npm ci                      # installs exactly what package-lock.json says
npm run build               # creates the dist/ folder
```

This produces `/home/noman/app/frontend/dist/` — plain HTML, CSS and JS files. nginx will serve these directly.

Let nginx read them:

```bash
chmod o+x /home/noman
chmod -R o+rX /home/noman/app/frontend/dist
```

> **If `npm run build` gets "Killed":** the server ran out of memory. Either add swap
> (`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`)
> or build on your laptop and upload the `dist` folder with `scp`.

---

## Part 6 — nginx: tie it all together

nginx is the traffic director. It decides: "is this request for the React app, or for the Django API?"

```bash
sudo nano /etc/nginx/sites-available/quran-platform
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 20M;          # allow profile picture uploads

    # --- Django API ---
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }

    # --- Django admin (where you edit courses) ---
    location /admin/ {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }

    # --- API documentation ---
    location ~ ^/(swagger|redoc)/ {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }

    # --- Django's own static files (admin CSS) ---
    location /static/ {
        alias /home/noman/app/backend/quran_platform/staticfiles/;
        expires 30d;
    }

    # --- Uploaded files (course thumbnails, profile pictures) ---
    location /media/ {
        alias /home/noman/app/backend/quran_platform/media/;
        expires 7d;
    }

    # --- Everything else: the React app ---
    location / {
        root /home/noman/app/frontend/dist;
        try_files $uri $uri/ /index.html;    # React Router needs this line
    }
}
```

> **Why `try_files ... /index.html`?** Your React app handles routes like `/apply` in the browser. If a user refreshes that page, nginx looks for a file called `apply` on disk, does not find it, and returns 404. This line says "if you cannot find the file, serve index.html and let React sort it out."

Switch it on:

```bash
sudo ln -s /etc/nginx/sites-available/quran-platform /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default        # remove the "Welcome to nginx" page
sudo nginx -t                                   # test the config - must say "syntax is ok"
sudo systemctl restart nginx
```

Visit `http://yourdomain.com`. **Your site is live.**

---

## Part 7 — Free HTTPS with Let's Encrypt

Never run a login form over plain http. This takes 2 minutes and is free:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Answer the questions, and choose **redirect http → https** when asked.

Certbot edits your nginx config for you and sets up automatic renewal. Test that renewal works:

```bash
sudo certbot renew --dry-run
```

Now visit `https://yourdomain.com` — you should see the padlock. 🔒

---

## Part 8 — After it is live

### 8.1 Stripe webhook (when you reach Phase 2)

In the Stripe dashboard → Developers → Webhooks → Add endpoint:

- URL: `https://yourdomain.com/api/payments/webhook/`
- Event: `payment_intent.succeeded`
- Copy the **signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in your `.env`
- Restart: `sudo systemctl restart gunicorn`

### 8.2 Backups — do not skip this

**Database backup, every night at 2am:**

```bash
mkdir -p /home/noman/backups
crontab -e
```

Add this line:

```
0 2 * * * pg_dump -U quranuser learning_system | gzip > /home/noman/backups/db-$(date +\%F).sql.gz && find /home/noman/backups -name "*.sql.gz" -mtime +30 -delete
```

That saves a compressed backup every night and deletes ones older than 30 days.

**Also turn on DigitalOcean's Droplet backups** in the dashboard ($2.40/mo). Database dumps protect you from bad SQL; Droplet snapshots protect you from a broken server.

### 8.3 Deploying an update later

Save this as `/home/noman/deploy.sh`:

```bash
#!/bin/bash
set -e                                   # stop immediately if any step fails

cd /home/noman/app
git pull origin feat/tech-courses

# Backend
cd backend/quran_platform
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Frontend
cd /home/noman/app/frontend
npm ci
npm run build

# Restart
sudo systemctl restart gunicorn
sudo systemctl reload nginx

echo "Deployed successfully."
```

```bash
chmod +x /home/noman/deploy.sh
```

From now on, updating the live site is one command: `./deploy.sh`

### 8.4 Reading the logs when something breaks

```bash
sudo journalctl -u gunicorn -n 100 --no-pager   # Django errors
sudo tail -f /var/log/nginx/error.log           # nginx errors
sudo systemctl status gunicorn                  # is it running?
```

---

## Part 9 — Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **502 Bad Gateway** | Gunicorn is not running | `sudo systemctl status gunicorn`, then read `journalctl -u gunicorn` |
| **Admin page has no styling** | `collectstatic` not run, or nginx `/static/` path wrong | Run `collectstatic`, check the `alias` path matches `STATIC_ROOT` |
| **404 when refreshing /apply** | Missing `try_files` in nginx | Add `try_files $uri $uri/ /index.html;` |
| **CORS error in the browser console** | Your domain is not in `CORS_ALLOWED_ORIGINS` | Add it to `.env`, restart gunicorn |
| **DisallowedHost error** | Domain missing from `DJANGO_ALLOWED_HOSTS` | Add it to `.env`, restart gunicorn |
| **React calls localhost:8000** | `.env.production` missing or build is stale | Create it, then `npm run build` again |
| **permission denied for schema public** | PostgreSQL 15+ permission change | Run the `GRANT ALL ON SCHEMA public` command from step 2.5 |
| **npm run build gets "Killed"** | Out of memory | Add swap, or build locally and `scp` the `dist` folder |
| **Emails never arrive** | Still on the console backend, or wrong Gmail password | Set `EMAIL_BACKEND` to SMTP, use a Gmail **App Password** |
| **Payment succeeds but stays "pending"** | The webhook 403 bug | Add `permission_classes = [AllowAny]` to `PaymentSuccessView` |

---

## Part 10 — Go-live checklist

Print this and tick each box.

**Security**
- [ ] `DJANGO_DEBUG=False`
- [ ] A fresh, random `DJANGO_SECRET_KEY` (not the development one)
- [ ] `DJANGO_ALLOWED_HOSTS` lists only your real domains
- [ ] `CORS_ALLOWED_ORIGINS` lists only your real domains
- [ ] `.env` is **not** committed to git (`git check-ignore .env` should print the file)
- [ ] `chmod 600 .env`
- [ ] Firewall on (`ufw status` shows active)
- [ ] SSH key login, root password login disabled
- [ ] HTTPS working, http redirects to https
- [ ] `python manage.py check --deploy` shows no warnings

**Working**
- [ ] `https://yourdomain.com` loads the React app
- [ ] `https://yourdomain.com/admin/` loads **with styling**
- [ ] You can log in to the admin
- [ ] You can add a course in the admin and see it on the public site
- [ ] Register a test account — the verification email actually arrives
- [ ] Submit a test application — it appears in the React admin panel
- [ ] Approve it — the status changes and a teacher is assigned
- [ ] Refresh the page on `/apply` — no 404

**Safety net**
- [ ] Nightly database backup cron job installed and tested
- [ ] DigitalOcean Droplet backups enabled
- [ ] `deploy.sh` written and tested
- [ ] You know how to read the logs

---

## Part 11 — What to learn next (DevOps path)

You do not need these on day one, but this is the order they become useful:

1. **Docker + docker-compose** — makes "it works on my machine" true everywhere, and makes moving hosts trivial
2. **GitHub Actions** — run the tests on every push, then deploy automatically when they pass
3. **Sentry** (free tier) — get an email the moment a user hits an error, instead of finding out weeks later
4. **DO Managed PostgreSQL** — move the database off the app server so a crash cannot destroy your data
5. **DO Spaces + `django-storages`** — move uploaded images to object storage so they survive a server rebuild
6. **Celery + Redis workers** — send emails and reminders in the background (already installed, just not wired up)
7. **Staging server** — a second cheap droplet where you test changes before customers see them
