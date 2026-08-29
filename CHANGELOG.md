# Changelog

All notable changes to this project are documented here. Entries are
generated automatically by [git-cliff](https://git-cliff.org/) from
Conventional Commit history whenever a `vX.Y.Z` release tag is pushed —
see `cliff.toml` and `.github/workflows/release.yml`.
## [0.2.0](https://github.com/T-slen-CRM/tslen-workhub/compare/v0.1.0...v0.2.0) - 2026-08-29

### Features

- *(meeting-room)* Add pre-join lobby, device picker, raise hand and chat

## [0.1.0](https://github.com/T-slen-CRM/tslen-workhub/compare/v0.0.1...v0.1.0) - 2026-08-27

### Features

- *(meeting-links)* Add guest meeting links

## [0.0.1] - 2026-08-27

### Breaking Changes

- *(auth)* Close client-controlled password-check bypass on login


### Features

- *(task-project)* Add findByPhaseId and findAllWithPhases

- *(notifications)* Add Notification entity and migration

- *(notifications)* Add NotificationsRepository

- *(notifications)* Add NotificationsService

- *(notifications)* Add NotificationsController and wire NotificationsModule

- *(live-kit)* Add notifyUser for pushing events to a specific connected user

- *(chat)* Create and push a live notification to the message recipient

- *(web)* Add LiveKitWebSocketService.notification$ stream

- *(web)* Extract NotificationBellComponent from nav-right

- *(web)* Wire NotificationBellComponent into the top nav and left nav

- *(docker)* Add docker-compose stack for self-hosted quickstart

- *(live-kit)* Make call window draggable with cross-tab picture-in-picture

- *(tasks)* Redesign the task detail dialog into a Jira-style layout

- *(config)* Generate frontend environment files from root .env

- *(audit-log)* Add user-action history log with IP capture

- *(audit-log)* Field-level change tracking with an admin viewer

- *(web)* Make ng lint CI-ready via bulk suppressions

- *(release)* Add changelog generation and tag-triggered release workflow


### Bug Fixes

- *(base-service)* Await createOneWithRelations so create() errors are caught

- *(external-tasks)* Resolve project via ProjectPhasesRelation, add project listing

- *(web)* Make the global loading fallback a non-blocking top bar

- *(notifications)* Add ownership check to prevent IDOR vulnerabilities

- *(chat)* Isolate notification failures from message ack

- *(notification-bell)* Unsubscribe live notifications on destroy

- *(notifications)* Restrict broadcast-create to admin/manager, fix status code

- *(web)* Share notification state across mounted bell instances

- *(google-calendar)* Stop cron crash on missing/stale Google token

- *(google-calendar)* Require ownership/role check before deleting a calendar

- *(chat)* Remove premature listenForEvents call in ChatComponent constructor

- *(ci)* Stop root lint from crashing on packages/web's missing plugins

- *(firebase)* Don't crash app boot on missing Firebase credentials

- *(web)* Make LiveKit connection URL configurable, not committed to git

- *(docker)* Copy migrations into production image and auto-run them on start

- *(docker)* Skip migration:run in MODE=DEV, rely on TypeORM synchronize

- *(docker)* Override FRONT_DOMAIN so CorsMiddleware doesn't 403 static assets

- *(web)* Default environment.prod.ts.example protocol to http

- *(live-kit)* Pass $event to ngOnDestroy so beforeunload is detectable

- *(live-kit)* Check calleeId() instead of the input function reference

- *(live-kit)* Remove disconnected sockets from the online users map

- *(live-kit)* Stop dialog.closeAll() from firing a spurious CALL_REJECTED

- *(live-kit)* Remove racy redundant register call, fix TDZ bug

- *(test)* Fix DI resolution failure in tasks e2e specs

- *(external-tasks)* Set createdAt and resolve assignee to a real relation

- *(web)* Clean up pre-existing lint issues in auth.service.ts

- *(web)* Remove dead MomentDateAdapter wiring, drop moment for good

- *(web)* Resolve ag-grid invalid colDef warnings and NG0955 in tasks-manager

- *(web)* Remove redundant unguarded sizeColumnsToFit call

- *(web)* Guard permissions-visualization against duplicate views

- *(manage-users)* Fix blank Users list grid

- *(web)* Fix logo/home links kicking logged-in users to login

- *(web)* Fix wrong auth route targets across login/logout flows

- *(web)* Remove dead campaigns/creatives feature remnants

- *(breadcrumb)* Resolve :id placeholder in current-page crumb link

- *(web)* Fix broken ng lint (eslint 9 flat config)

- *(web)* Remove unused imports and unused vars/params

- *(pending-aggrid)* Stop the grid getting stuck on its loading overlay


### Other

- Add global chat notifications design spec

- Add global chat notifications implementation plan

- Add design spec for self-hosted docker compose quickstart

- Add implementation plan for docker compose self-hosted quickstart

- Record dockerignore fix found during Task 2 build verification

- Record migration-bootstrap discovery and smoke test results

- Document docker compose self-hosted quickstart

- Note README's final content vs the plan's stale draft

- Record FRONT_DOMAIN CORS discovery found via live browser testing

- Mention environment.prod.ts protocol setting in getting-started

- Record protocol/HTTPS discovery and missing environment.prod.ts

- *(live-kit)* Add diagnostics for connect failures and unexpected teardown

- Add design spec for draggable call window + cross-tab PiP

- Add implementation plan for draggable call window and cross-tab PiP

- Add design spec for task detail dialog redesign

- Add implementation plan for task detail dialog redesign

- *(tasks)* Shrink the title/description edit and done icon buttons

- *(tasks)* Compact title/phase fields, unify labels, move edit icon

- *(tasks)* Float the phase pill label, redesign attachments as chips

- *(web)* Silence CommonJS dependency build warnings

- *(web)* Migrate frontend tests from Karma/Jasmine to Jest

- Add implementation plan for Node.js/Angular version bump

- *(web)* Add Angular lint check to main-ci workflow

- Document CI checks, fix stale Angular/Node version references


