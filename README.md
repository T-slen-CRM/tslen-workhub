# T-Slen Workhub

Open source, self-hosted CRM and team workspace platform for small and medium businesses — combining CRM, HR, project management, scheduling, and internal communication in one app.

## Features

- **Company management** — company profiles, company-wide rules, job positions
- **Task & project management** — task list, task manager, task phases/projects
- **HR tools** — days-off rules and approvals, user & group management
- **Scheduling** — personal and shared team calendars, Google Calendar sync
- **Video meetings** — built-in calls via LiveKit, plus Google Meet integration
- **Team chat** — real-time messaging over WebSockets
- **Main wall** — company-wide posts and announcements feed
- **Inventory management**
- **Slack notifications** for application errors/warnings/info
- **Pomodoro timer** for focus tracking

## Tech stack

- **Backend:** NestJS, TypeORM + PostgreSQL, JWT auth, WebSockets, Swagger
- **Frontend:** Angular 20
- **Integrations:** Google Calendar & Meet APIs, LiveKit, Slack API, Firebase (storage), Nodemailer
- **Deployment:** Docker multi-stage build

## External API

Tasks can also be listed and created from outside the app — scripts, CI,
Zapier, or any other external tool — using a personal API token, separate
from the web app's login session. See
[`docs/api/external-tasks-api.md`](docs/api/external-tasks-api.md) for the
full reference.

## Getting started

1. Copy `.env.example` to `.env`. `JWT_SECRET` needs a real value; Google,
   Slack, and Firebase credentials can stay as placeholders for a first
   run — those integrations are optional and only needed for Calendar
   sync, Slack alerts, and file uploads respectively. `DB_*` values only
   matter for bare-metal dev (steps 4–5, against your own Postgres) — the
   Docker Compose quickstart below needs no DB credentials at all.
2. Copy `packages/web/src/environments/environment.prod.ts.example` to
   `environment.prod.ts` in the same folder (gitignored, same idea as
   `.env.example` → `.env`). Leave `livekitUrl` empty to use the Compose
   quickstart's self-hosted LiveKit server, or set it to your own LiveKit
   server/Cloud project URL. Leave `protocol` as `http://` for the Compose
   quickstart (step 6) — only change it to `https://` if you're building
   for a real HTTPS deployment behind Traefik (step 7).
3. Install dependencies:
   ```bash
   npm install
   cd packages/web && npm install
   ```
4. Run the backend:
   ```bash
   npm run start:dev
   ```
5. Run the frontend:
   ```bash
   cd packages/web && npm start
   ```
6. Or run the whole stack with Docker Compose — Postgres, a self-hosted
   LiveKit server, and the app:
   ```bash
   docker compose up
   ```
   No external accounts and no DB credentials are required to boot. The
   schema is created automatically (TypeORM `synchronize`, since `.env`'s
   default `MODE=DEV`); for a `MODE=PROD` deployment, migrations run
   automatically instead (`npm run migration:run` is only needed manually
   for bare-metal dev, and only once your schema already exists).
7. For a production deployment behind Traefik with automatic HTTPS, copy
   `start.sh.example` to `start.sh` (gitignored, same idea as
   `.env.example` → `.env`), set `DOMAIN` and customize as needed, then
   `chmod +x start.sh && ./start.sh`.

## License

MIT
