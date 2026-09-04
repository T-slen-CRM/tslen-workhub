---
name: demo-recorder
description: Re-record the product demo GIFs/video used in README.md and the t-slen.com landing page (e.g. after a UI change). Use when asked to update, redo, or refresh the demo GIFs, screenshots, or landing-page video.
---

# Demo recorder

Regenerates the demo assets in two places from one recording session:

- `tslen-workhub/docs/demo/*.gif` → linked from the README's `## Demo` section.
- `t-slen.com/demo/*.gif` + `demo/workhub-walkthrough.mp4` → the landing
  page's hero video and "See it in action" gallery.

Both reference fixed filenames, so re-recording and overwriting the same
paths updates both pages with **no markdown/HTML edits needed** — only do
the edit steps below if you're adding/removing a clip, not just refreshing
existing ones.

## When to use this

- After a UI fix/change that's visible in one of the existing clips (the
  reason this skill exists: three CSS bugs were found by re-watching a
  recorded demo, fixed, and the affected GIFs re-recorded).
- When asked to add a new feature's demo clip.
- Periodically, so the demo doesn't drift from the current app.

## 0. Prerequisites

- Local backend running: `nvm use 24.19.0 && npm run start:dev` (port 4004).
- Local frontend running: `cd packages/web && npm start` (port 4200).
- Local Postgres reachable (`localhost:5432`, db `tslen`) — Postgres.app or
  `docker compose up postgres`.
- Chrome browser tools loaded (`tabs_context_mcp`, `navigate`, `computer`,
  `gif_creator`, `javascript_tool` if you need to debug).

## 1. Ensure the demo data exists

The demo lives in its own isolated company ("Acme Robotics"), never in the
real companyId=1 data — real accounts have messy test-user clutter that
isn't camera-ready.

Check first (avoid piling up duplicate demo companies):
```bash
/Applications/Postgres.app/Contents/Versions/17/bin/psql -h localhost -p 5432 -U "$(whoami)" -d tslen \
  -c "select id, name from company where name = 'Acme Robotics';"
```
If empty, seed it:
```bash
nvm use 24.19.0
npx ts-node -r tsconfig-paths/register scripts/seed-demo-data.ts
```
This uses the app's real services (not raw SQL), so password hashing, the
per-user daysOff balance, `ProjectPhasesRelation` cascade, etc. all run
exactly as they do through the API. It prints the new `companyId` and the
demo login at the end:

**Login:** `demo.admin@t-slen.local` / `DemoWorkhub2026!` (Sarah Chen, admin)

If you need fresh pending requests to demo the approve flow (the seed data's
one pending request may already be approved from a prior recording session),
just create a new one live during recording — see clip 3/4 below.

`scripts/seed-demo-data.ts` already bakes in every data-quality fix found
while building this the first time (see the comments inline for why each
exists) — if you ever touch that script, keep them:
- staggered `firstDayInCompany` per user (not one shared date — clusters
  everyone's "anniversary" on the same day)
- the demo login (`sarah`) is a member of **every** seed project (Tasks
  Manager only shows projects the logged-in user has permission on)
- no duplicate `ProjectPhasesRelation` rows (`TaskProjectSubscriber`
  already creates one per phase — don't insert them again)
- every task gets an explicit `estimate` and `updatedAt` (null renders as
  a ~20700-day countdown/"updated X days ago" — the UI diffs against
  epoch 1970 for a missing date)
- a few `posts` rows so the dashboard's News feed isn't empty (`title` is
  the author's display name, not a headline; `subtitle` is the date)

## 2. Log in and sanity-check each page once, unrecorded

Navigate to `http://localhost:4200`, log in as the demo admin, and click
through whatever pages you're about to record. Fix anything that looks
wrong (data or UI) *before* recording — re-recording is cheap, but a GIF
with a bug in it is how this skill got created in the first place.

## 3. Record each clip

Pattern for every clip:
```
navigate to the starting page
gif_creator start_recording
computer screenshot                      # first frame
...perform the actions, screenshot after each meaningful state change...
gif_creator stop_recording
gif_creator export (download: true, showWatermark: false, showActionLabels: false,
                     showClickIndicators: true, showProgressBar: false, quality: 8)
```
Keep each short clip under the 50-frame recorder cap — one focused flow per
clip, not a whole tour. Screenshot after *every* click/type that changes
what's on screen; actions without a following screenshot don't reliably
turn into frames.

Current clip set (filenames are what both README.md and t-slen.com's
`index.html` already reference):

| File | Flow |
|---|---|
| `01-dashboard.gif` | Land on `/pages/main-wall`, scroll the News feed. |
| `02-kanban-task-comment-move.gif` | Tasks Manager → a project board → open a task → add a comment → change its phase → Save. |
| `03-personal-schedule-request-vacation.gif` | Personal schedule → Month view → click a free day → check "Make a request" → pick the vacation icon → comment → Save. |
| `04-approve-request-company-calendar.gif` | Company calendar (List view, shows the pending request pale) → `/admin/pending` → approve → back to company calendar (now solid/approved). |
| `05-manage-users-profile.gif` | **Currently broken** — People list → a user's name routes to `/pages/user-card-info/:id`, which is an empty stub page ("no user found"). Don't re-record this one until that page is fixed; navigate straight to `/pages/user-profile/:id` instead once it's usable as a replacement clip. |

For the full walkthrough (`workhub-full-walkthrough.gif` / `workhub-walkthrough.mp4`):
one continuous recording chaining all of the above (start from `/auth/login`,
log in on camera, then run clips 1–4 back to back, end on a user's profile
page). This one hits the 50-frame cap — budget your screenshots across the
whole flow instead of per-clip.

## 4. Fix "downloaded twice" filenames

`gif_creator export` downloads into `~/Downloads/`. If a file with that name
already exists, Chrome appends `(1)` instead of overwriting:
```bash
rm ~/Downloads/<name>.gif
mv ~/Downloads/"<name> (1).gif" ~/Downloads/<name>.gif
```

## 5. Convert the full walkthrough to mp4 (landing-page hero only)

The raw GIF is too heavy (~5MB) for an autoplaying hero video. Speed it up
2x and re-encode:
```bash
cd ~/Downloads
ffmpeg -y -i workhub-full-walkthrough.gif \
  -filter:v "setpts=0.5*PTS" -fps_mode passthrough -bf 0 \
  -movflags +faststart -pix_fmt yuv420p -c:v libx264 -crf 23 -preset medium \
  workhub-walkthrough.mp4
```
- `-fps_mode passthrough` is required — without it, ffmpeg silently drops
  roughly half the input frames trying to hit a default output frame rate.
- `-bf 0` disables B-frames — with them on, some frames render as a
  cross-fade ghost blend between two very different screenshots for an
  instant (harmless-looking as a JPEG sample, but worth avoiding).
- Verify frame count matches the input before trusting the output:
  `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames,duration -of default=noprint_wrappers=1 <file>`

## 6. Place the files

```bash
cp ~/Downloads/{01-dashboard,02-kanban-task-comment-move,03-personal-schedule-request-vacation,04-approve-request-company-calendar,workhub-full-walkthrough}.gif \
   /Users/olegteslenko/Desktop/T/tslen-workhub/docs/demo/

cp ~/Downloads/{01-dashboard,02-kanban-task-comment-move,03-personal-schedule-request-vacation,04-approve-request-company-calendar}.gif \
   ~/Downloads/workhub-walkthrough.mp4 \
   /Users/olegteslenko/Desktop/T/t-slen.com/demo/
```
Same filenames in, same filenames out → no markdown/HTML changes needed for
a routine refresh of an existing clip.

Only touch `README.md` / `t-slen.com/index.html` + `styles.css` if you're
**adding or removing** a clip, not just re-recording one that already
exists — see the current `## Demo` section and `#demo` section in those
files for the pattern to copy (a 2-column table in the README, a
`.demo-card` `<figure>` in the HTML).

## 7. Verify before committing

- Preview `t-slen.com` locally with a server that supports HTTP Range
  requests (needed for `<video>` — Python's `http.server` does NOT support
  them and the hero video will hang forever):
  ```bash
  cd /Users/olegteslenko/Desktop/T/t-slen.com && npx --yes serve -l 8835 .
  ```
  Then open `http://localhost:8835/index.html`. If a video looks stuck at
  0:00 in Claude's own automated browser tab specifically, that's a known
  quirk of that sandboxed tab's autoplay-before-interaction behavior, not a
  real bug — confirm the file/markup are fine with:
  ```js
  const v = document.querySelector('.hero-video');
  v.load(); await v.play();  // should resolve with v.paused === false
  ```
- `.gitignore` in `tslen-workhub` excludes everything under `docs/` except
  an explicit allowlist — `docs/demo/` is already in it; if you ever rename
  that folder, update the allowlist too.

## 8. Commit

Both repos: Conventional Commits, no `Co-Authored-By` omission (see each
repo's own AGENTS.md/history for the exact trailer this session uses).
`tslen-workhub` wants a dedicated branch off `main` (branch-per-task); ask
before merging/pushing — don't assume. `t-slen.com` has been committed
straight to `main` historically for changes this size; match that unless
told otherwise. Never push without the user explicitly asking, even after
everything above passes.
