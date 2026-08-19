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

1. Copy `.env.example` to `.env` and fill in your DB, Google, Slack, and Firebase credentials.
2. Install dependencies:
   ```bash
   npm install
   cd packages/web && npm install
   ```
3. Run the backend:
   ```bash
   npm run start:dev
   ```
4. Run the frontend:
   ```bash
   cd packages/web && npm start
   ```
5. Or build and run with Docker (see `Dockerfile`):
   ```bash
   docker build -t tslen-workhub .
   docker run --env-file .env -p 4004:4004 tslen-workhub
   ```
   For a Traefik-fronted deployment, copy `start.sh.example` to `start.sh`
   (gitignored, same idea as `.env.example` → `.env`), set `DOMAIN` and
   customize as needed, then `chmod +x start.sh && ./start.sh`.

## License

MIT
