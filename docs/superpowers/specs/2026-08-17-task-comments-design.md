# Task Comments — Design

## Motivation

A teammate (Oleksandr) described a ticket-centric dev workflow: all
discussion/blockers/decisions live in the ticket, review outcomes
(LGTM or reject-and-reassign) are recorded in the ticket, and anyone
checking status reads the ticket instead of pinging Slack or waiting
for a weekly meeting. T-Slen's Tasks module already has most of the
scaffolding for this (status pipeline, multi-assignee, attachments,
a real-time kanban board) but has no way to record a discussion
thread on a task. That's the missing piece this feature adds.

This is deliberately scoped to comments only. A more formal
reviewer-assignment/approval-status concept was considered and
explicitly deferred — see "Out of scope" below.

## Decisions made during brainstorming

- **Scope**: comments only, as the first sub-project. Reviewer
  role/approval workflow is a possible fast-follow, not part of this.
- **Real-time**: fetch-on-open, not live via WebSocket. Simpler; no
  changes to `TasksGateway`.
- **Content**: plain text, not the rich-text editor used for task
  descriptions. Avoids a new XSS surface (rendered HTML from other
  users) and keeps the comment form simple.
- **Attachments**: none in v1. Task-level attachments already exist
  separately.
- **Mutability**: comments are immutable — no edit, no delete. They're
  a discussion/audit trail; immutability keeps that trail trustworthy
  and avoids edit-history/permission-check complexity.
- **Permissions**: any authenticated user can read/write comments on
  any task, matching how tasks themselves work today (no existing
  per-task read restriction to piggyback on).
- **Notifications**: not in v1. A comment-created notification via the
  existing `NotificationService`/bell icon is a natural fast-follow
  once the comment feature itself exists to notify about.
- **Storage shape — relation on `Tasks` vs. separate resource**:
  separate resource (own repository/service/controller, fetched via
  `GET /task-comments?taskId=`), *not* an eager relation on the `Tasks`
  entity. `taskAttachments` and `taskUserAssignmentRelations` are
  eager relations today, but both are small and roughly fixed in
  size; a comment thread is open-ended and grows over time. An eager
  relation is pulled into *every* query against `Tasks`, including
  `findAll()` for the whole kanban board — so it would make the board
  fetch progressively heavier as threads accumulate, even though the
  board never displays comments. A dedicated endpoint pays that cost
  only when a task's detail view actually opens, and leaves room to
  paginate later without touching the `Tasks` response shape the rest
  of the app depends on. This mirrors how chat messages are already a
  separate resource rather than a relation on some parent entity.

## Data model

New entity `TaskComment`
(`src/resources/task-comments/entities/task-comment.entity.ts`),
following the `TaskAttachments`/`BaseAbstractEntity` pattern:

```ts
@Entity("taskComments")
export class TaskComment extends BaseAbstractEntity<TaskComment> {
    constructor (entity: Partial<TaskComment>) { super(entity); }

    @Column("int", { name: "taskId", nullable: true })
        taskId: number | null;

    @Column("int", { name: "userId", nullable: true })
        userId: number | null;

    @Column("text", { name: "content" })
        content: string;

    @CreateDateColumn({ name: "createdAt" })
        createdAt: Date;

    @ManyToOne(() => Tasks, {
        onDelete: "CASCADE",
        orphanedRowAction: "delete",
    })
    @JoinColumn([{ name: "taskId", referencedColumnName: "id" }])
        task: Tasks;

    @ManyToOne(() => Users, { eager: true })
    @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
        user: Users;
}
```

Unidirectional `ManyToOne` — no inverse `taskComments` field is added
to the `Tasks` entity. TypeORM doesn't require one, and adding it
would invite exactly the "gets pulled into every `Tasks` query"
problem this design is avoiding; all reads go through
`TaskCommentsRepository` directly, keyed by `taskId`.

Indexes, matching existing naming convention:
`@Index("taskComments_tasks_id_fk", ["taskId"], {})` and
`@Index("taskComments_users_id_fk", ["userId"], {})`.

A hand-written migration (this repo has no live DB available to
`migration:generate` against) creates the `taskComments` table with
those two indexes and the FK constraints, following the same shape
as `migrations/add-messages-chat-room-index/`.

## Backend API

New top-level module `src/resources/task-comments/` (sibling to
`task-phase`/`task-project`, same granularity as today):

- `TaskCommentsRepository extends BaseAbstractRepository<TaskComment>`
  — no custom query logic beyond the base `find`/`save`.
- `TaskCommentsService extends BaseAbstractService<TaskComment>` with
  one addition: `findByTask(taskId: number): Promise<TaskComment[]>`
  → `find({ where: { taskId }, order: { createdAt: 'ASC' } })`
  (oldest-first, same convention chat history uses).
- `TaskCommentsController`:
  - `GET /task-comments?taskId=123` → `findByTask`. `taskId` required
    (400 if missing/non-numeric, via `ParseIntPipe` on a query param
    or a small validated query DTO).
  - `POST /task-comments` → body validated by `CreateTaskCommentDto
    { taskId: number; content: string }`; `userId` is taken from the
    authenticated `@User()` decorator, never trusted from the client.
  - No `PATCH`/`DELETE` routes (matches immutability decision).
- `CreateTaskCommentDto`: `@IsNumber() taskId`, `@IsString()
  @IsNotEmpty() content` (class-validator, matching existing DTOs).
- `TaskCommentsModule` registers `TypeOrmModule.forFeature([TaskComment])`
  and is added to `app.module.ts`'s imports, next to the other
  `task-*` modules.

## Frontend

New standalone `TaskCommentsComponent`
(`packages/web/src/app/tslen-components/task-comments/`):

- Input: `taskId: number`.
- On init: `dataService.getObservableData('/task-comments?taskId=' +
  taskId)`, populates a local list.
- Submit: `dataService.postData('/task-comments', { taskId, content
  })`; on success, append the server's response (real id, timestamp,
  author) to the local list and clear the textarea.
- Template: a plain `<textarea>` + "Post" button (disabled when
  content is empty/whitespace-only), and a list of prior comments
  rendered oldest-first — author name, `DatePipe`-formatted
  timestamp, content — visually consistent with the existing dialog
  styling (not the chat bubble style, since this isn't a live chat).
- New `ITaskComment` interface in `interfaces/tasks.ts`:
  `{ id: number; taskId: number; content: string; createdAt: string;
  user: { id: number; firstName: string; lastName: string } }`
  (shape matches what the eager `user` relation serializes to).

Mounted inside `task-create-edit.component.html`, gated the same way
attachments already are — only rendered once `taskId` is truthy
(i.e. editing an existing task; a brand-new unsaved task has nothing
to attach comments to).

## Testing

- Backend:
  - `TaskCommentsService` unit test: `findByTask` calls the
    repository with the right `where`/`order` and returns the result
    (automock `TestBed` pattern, matching `PostsService`'s spec).
  - `TaskCommentsController` unit test: `create` passes the
    authenticated user's id as `userId`, not anything from the
    request body; `findAll`/`GET` requires `taskId`.
  - DTO validation test (or covered via controller e2e): empty
    `content` is rejected.
- Frontend: `TaskCommentsComponent` spec — loads and renders comments
  on init; posting appends the new comment to the list and clears the
  input; Post is disabled for empty/whitespace content. Mock
  `DataService` (`jasmine.createSpyObj`), matching the pattern used
  for `ChatComponent`'s spec.

All new tests are written test-first (RED confirmed, then GREEN),
per this repo's TDD convention.

## Error handling

- Empty/whitespace-only content: rejected client-side (Post button
  disabled) and server-side (`class-validator` 400).
- Non-existent `taskId` on create: the FK constraint rejects it at
  the DB level; the controller/service doesn't pre-check existence
  (no other resource in this app does that check either — consistent
  with existing conventions, and the FK failure is a clear enough
  signal).
- Task deletion cascades to its comments (`onDelete: CASCADE`) — no
  orphaned rows.

## Out of scope (possible fast-follows, not part of this spec)

- Formal reviewer assignment / approve-reject status on a task.
- Comment-created notifications (bell icon / `NotificationService`).
- Editing or deleting a comment.
- Rich text / attachments on comments.
- Live (WebSocket) delivery of new comments to other viewers.
- Read/write permission restriction to task participants only.
