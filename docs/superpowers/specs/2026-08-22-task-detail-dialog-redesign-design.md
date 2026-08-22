# Task Detail Dialog Redesign — Design Spec

## Context

The task detail dialog (`packages/web/src/app/tslen-components/task-create-edit/`)
is currently a flat two-column Material dialog: a description column and a
"settings" column mixing form fields (estimate, priority, phase, assignee,
attachments) with the comments list tacked on at the bottom. The user wants
it restyled closer to Jira's issue-detail layout — see the attached
screenshots (Jira issue view, dark theme): large title, description above an
Activity feed with tabs (`All` / `Comments` / `History`), and a right-hand
"Details" sidebar (Assignee, Priority, Due date, Reporter, etc.).

This spec covers **only the detail dialog** — the small Kanban board tile
(`tasks-list.component.html`'s `.list-box`) is out of scope. It also covers
**only the visual/layout redesign plus two real UI bugs found in the
Assignee field along the way** — the actual Activity/History-log data
(who created/assigned/commented/moved, and when) is a separate spec and
plan, built on top of the `History` tab shell this spec creates.

## Non-goals

- **Per-field click-to-edit** (Jira's "click a field, it becomes editable,
  auto-saves"). The dialog keeps its current single reactive form + one
  Save button. Every field stays visibly editable the whole time; nothing
  is hover-revealed.
- **Jira's other Activity tabs** (`Work log`, `Time in Status`,
  `Timepiece`) — this app has no time-tracking subsystem, so only `All`,
  `Comments`, and `History` are built.
- **Per-status colors** for the status pill. Phases (`TaskPhase`) are
  user-defined board columns with no color field, not a fixed enum like
  Jira's To Do/In Progress/Done — the pill uses one consistent accent
  color regardless of which phase is selected.
- **Restyling the Kanban board tile.**
- **The History tab's actual content** (activity log entries) — this spec
  only builds the tab shell + an empty state; a follow-up spec/plan adds
  the backend audit trail and wires real entries into this tab.

## Layout

Replace `task-create-edit.component.html`'s current two-column form with:

```
┌──────────────────────────────────────────────────────────────┬───────────────────┐
│ [title input, large]                          [phase pill ▾] │  Details           │
│                                                                │  ─────────────     │
│ Description                                                   │  Assignee          │
│  (preview/edit toggle — see below)                             │  [autocomplete]    │
│                                                                │                     │
│ ─────────────────────────────────────────                     │  Priority          │
│ Activity                                                       │  [select]          │
│ [All] [Comments] [History]                                    │                     │
│  ...tab content...                                             │  Estimate          │
│                                                                │  [datepicker]      │
│                                                                │                     │
│                                                                │  Created by        │
│                                                                │  (read-only)       │
│                                                                │                     │
│                                                                │  Attachments       │
│                                                                │  [compact list]    │
├──────────────────────────────────────────────────────────────┴───────────────────┤
│  [Cancel]  [Save]                                                    [Delete 🗑]  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

- **Header row**: `title` as a large borderless-looking input (still a
  real `formControlName="title"` — same validation as today), and the
  phase/status pill on the right — a `mat-select` for `phaseId`, restyled
  to look like a colored pill/badge (one consistent accent color, not
  per-phase).
- **Left column (main)**: description, then the Activity section.
- **Right column ("Details" sidebar)**: labeled rows, each a small caption
  above the real Material control — Assignee, Priority, Estimate, a
  read-only "Created by" row (`createdByName`), then Attachments as a
  compact list (same upload/preview/delete behavior as today, restyled).
- **Footer**: unchanged — Save / Cancel / Delete.

### Sidebar visual language

Since editing stays on the current single-form model (no hover-to-reveal
click targets — that pattern only makes sense with true per-field
auto-save editing, which is explicitly out of scope), the sidebar is
**labeled rows**: a small uppercase-ish caption above each real,
always-interactive Material control (`mat-select`, the assignee
autocomplete, the datepicker). This reads as organized and
Jira-*inspired* without pretending the fields are anything other than
what they are — normal form controls saved together via the dialog's
existing Save button.

### Theming

Built with the app's existing `.dark-mode` class-based theming (light by
default, dark variant via that class already used elsewhere, e.g.
`tasks-list.component.scss`), not Jira's dark-only palette — so the
dialog matches the rest of the app in both modes instead of introducing
an inconsistent one-off dark theme.

## Description: preview/edit toggle with collapse

Current behavior: `<app-text-editor formControlName="description">` is
always rendered as the full rich-text editor with toolbar, regardless of
whether the user is actively editing.

New behavior:

- **Preview mode** (default whenever the task already has a
  description): render the stored HTML read-only, sanitized the same way
  `posts.component.ts` already does for its own stored rich-text content
  (`DomSanitizer.bypassSecurityTrustHtml`, bound via `[innerHTML]`),
  styled as plain text — no toolbar chrome, no editor border.
- If the rendered preview is taller than a fixed threshold (a few lines,
  e.g. ~150px), it's clipped with a **"Show more" / "Show less"** toggle
  that only expands/collapses the read-only text — it does not enter edit
  mode.
- An explicit **Edit ↔ Done** toggle (a button/icon, not a click-anywhere
  or blur handler) switches between preview and the real
  `app-text-editor` in place. Typing in the editor updates the form
  control live via its existing `ControlValueAccessor`, exactly as today
  — there is no separate save/cancel for just the description; the
  dialog's single Save button still commits it along with everything
  else.
  - Explicit-toggle only (no auto-collapse on blur) is a deliberate
    choice: rich editors like the one in use here (toolbar dropdowns,
    image-insert dialogs) make blur/click-outside detection unreliable —
    a stray blur while interacting with the toolbar would prematurely
    collapse the editor mid-edit.
- **New tasks** (no `data.task`, i.e. empty description) open directly in
  edit mode — there's nothing to preview yet.

## Assignee field bugs (found during this redesign, fixed as part of it)

Two real bugs in the existing Assignee field
(`task-create-edit.component.html`'s `<app-autocomplete>`, backed by
`AutocompleteComponent` at
`packages/web/src/app/components/autocomplete/autocomplete/autocomplete.component.html`):

1. **Wrong translation key.** The Assignee field is bound to
   `[nameOfList]="'task.form.move_card'| translate"` — the exact same key
   used by the phase `<mat-select>` immediately above it in the template
   (`task.form.move_card` = "Move card to phase"). This is a copy-paste
   bug: the Assignee field shows "Move card to phase" as its label
   instead of an assignee-specific label, in every locale.

   Fix: add a new `task.form.assignee` key ("Assignee" in English) to all
   five locale files (`en`, `uk`, `fr`, `ru`, `es`, matching the existing
   `task.form.*` key style), and change the binding to
   `[nameOfList]="'task.form.assignee'| translate"`.

2. **Label disappears once a value is selected.**
   `autocomplete.component.html` only renders `<mat-label>` conditionally:
   ```html
   @if (!selectedData.length) {
       <mat-label>{{nameOfList}}</mat-label>
   }
   ```
   So as soon as one assignee is picked, the label is removed from the DOM
   entirely, rather than floating up the way Angular Material's
   `mat-form-field` normally handles a label when its content is
   non-empty. The field then shows chips with no indication of what
   they're chips *of*.

   Fix: remove the `@if` guard and always render `<mat-label>` — Material's
   own floating-label behavior (already relied on by every other
   `mat-form-field` in this dialog, e.g. priority, estimate) handles
   shrinking it above the filled content automatically. This is a shared
   component (`AutocompleteComponent`), so verify its other call sites
   (grep for `app-autocomplete` usages) aren't relying on the label being
   absent once filled — expected to be a strict visual improvement
   everywhere it's used, but must be checked, not assumed.

## Testing

- Frontend (Karma/Jasmine): update/extend
  `task-create-edit.component.spec.ts` (create if it doesn't exist yet —
  check first) to cover: description defaults to preview mode when a
  description is present vs. edit mode for a new task; the Edit/Done
  toggle switches modes without touching the form's saved value until
  Save is clicked; the "Show more/less" collapse toggle only affects
  rendering, not form state.
- Manual verification: open an existing task with a long description,
  confirm collapse/expand and Edit/Done work in both light and dark mode;
  open a new (empty) task, confirm it starts in edit mode; verify the
  Assignee field now shows "Assignee" as its label in each of the 5
  locales and that the label stays visible once an assignee is selected;
  check every other `app-autocomplete` usage in the app still looks
  correct after the label-visibility fix.
