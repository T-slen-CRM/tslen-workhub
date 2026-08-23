# Audit Log Admin Viewer (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin-only page under `/admin/audit-log` that lists recent audit log rows, reusing the existing ag-grid table pattern from Inventory, with a "Changes" column rendering each row's `changes[]` as readable lines (e.g. `phaseId: ToDo → In progress`).

**Architecture:** New `admin/audit-log/` feature directory mirroring `admin/inventory/`'s structure exactly: an `IAuditLog` interface, an `AuditLogService` delegating to the existing `DataService.getObservableData('/audit-log')`, and an `AuditLogComponent` binding to the shared `AgGridTableComponent`. A new custom ag-grid cell renderer (`AuditLogChangesRenderComponent`, declared in `TslenComponentsModule` alongside the existing `InventoryRenderComponent`) formats the `changes[]` array. The route is admin-only via the existing `RoleGuard`; the nav entry is a new admin-only nav group (the existing `admin` nav group also grants `manager`, so it can't be reused as-is).

**Tech Stack:** Angular 17 (standalone components), ag-grid-community, Karma/Jasmine.

**Spec:** `docs/superpowers/specs/2026-08-23-audit-log-changes-view-design.md` (Frontend section)

## Global Constraints

- Two separate npm projects — run frontend commands from `packages/web/`, not the repo root.
- Standalone components (no `standalone: false`, no `NgModule` declarations) for page-level components, matching `admin/inventory/inventory.component.ts`'s style exactly (an `imports: [...]` array with no explicit `standalone:` key — this project's default is standalone).
- ag-grid custom cell renderers are the one exception: they're declared in `TslenComponentsModule` (`standalone: false`), matching `InventoryRenderComponent` — Angular's AOT compiler requires every non-standalone component to be declared in exactly one `NgModule` somewhere in the app; it does not need to be the same module that references it via ag-grid's `components: {...}` map.
- Conventional Commits, no Jira, no `Co-Authored-By: Claude` trailer (see `AGENTS.md`).
- TDD for real logic (the `formatAuditChanges` pure function). Page/service/wiring files with no branching logic follow this repo's existing convention of no dedicated test for that shape of file (`InventoryService`, `InventoryComponent` have none either) — verified instead via `ng build` + a manual browser check, per this repo's UI-change convention.
- Frontend spec location: `*.spec.ts` next to the file it covers, run via `npm test` (Karma/Jasmine) from `packages/web/`.

---

### Task 1: `IAuditLog` interfaces + `AuditLogService`

**Files:**
- Create: `packages/web/src/app/admin/audit-log/interfaces/audit-log.ts`
- Create: `packages/web/src/app/admin/audit-log/services/audit-log.service.ts`

**Interfaces:**
- Produces: `IAuditFieldChange`, `IAuditEntityChange`, `IAuditLog` (mirroring the backend `AuditLog` entity and `changes[]` shape from `docs/superpowers/specs/2026-08-23-audit-log-changes-view-design.md`), and `AuditLogService.getAuditLogs(): Observable<IAuditLog[]>` — used by `AuditLogComponent` (Task 3).

No branching logic in either file — matches `InventoryService.getInventory()`'s untested shape exactly (no `inventory.service.spec.ts` exists in this repo either). Verified via `ng build` in Task 4.

- [ ] **Step 1: Write the interfaces**

```typescript
// packages/web/src/app/admin/audit-log/interfaces/audit-log.ts
export interface IAuditFieldChange {
    field: string;
    from?: unknown;
    fromLabel?: string | null;
    to?: unknown;
    toLabel?: string | null;
}

export interface IAuditEntityChange {
    entityName: string;
    entityId: number | string;
    action: 'insert' | 'update' | 'delete';
    fields: IAuditFieldChange[];
}

export interface IAuditLog {
    id: number;
    userId: number | null;
    ip: string;
    userAgent: string | null;
    method: string;
    route: string;
    resourceType: string | null;
    resourceId: string | null;
    statusCode: number;
    requestBody: Record<string, unknown> | null;
    changes: IAuditEntityChange[] | null;
    createdAt: string;
}
```

- [ ] **Step 2: Write the service**

```typescript
// packages/web/src/app/admin/audit-log/services/audit-log.service.ts
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../../../services/data.service';
import { IAuditLog } from '../interfaces/audit-log';

@Injectable({
    providedIn: 'root'
})
export class AuditLogService {
    private dataService = inject(DataService);

    getAuditLogs (): Observable<IAuditLog[]> {
        return this.dataService.getObservableData('/audit-log');
    }
}
```

- [ ] **Step 3: Commit**

```bash
cd packages/web
git add src/app/admin/audit-log/interfaces/audit-log.ts src/app/admin/audit-log/services/audit-log.service.ts
git commit -m "feat(audit-log): add IAuditLog interfaces and AuditLogService"
```

---

### Task 2: `formatAuditChanges` + `AuditLogChangesRenderComponent`

**Files:**
- Create: `packages/web/src/app/tslen-components/ag-grid/audit-log-changes-render/audit-log-changes-render.component.ts`
- Test: `packages/web/src/app/tslen-components/ag-grid/audit-log-changes-render/audit-log-changes-render.component.spec.ts`
- Modify: `packages/web/src/app/tslen-components/tslen-components.module.ts`

**Interfaces:**
- Consumes: `IAuditEntityChange` (Task 1).
- Produces: `formatAuditChanges(changes: IAuditEntityChange[] | null): string[]` (the pure, unit-tested logic) and `AuditLogChangesRenderComponent` (the ag-grid cell renderer wrapper, `agInit(params)` matching `InventoryRenderComponent`'s contract) — referenced by `AuditLogComponent`'s `components` map (Task 3).

This is the one piece of real logic in this plan, so it's the only one with a dedicated TDD cycle.

- [ ] **Step 1: Write the failing tests**

```typescript
// audit-log-changes-render.component.spec.ts
import { AuditLogChangesRenderComponent, formatAuditChanges } from './audit-log-changes-render.component';
import { IAuditEntityChange } from '../../../admin/audit-log/interfaces/audit-log';

describe('formatAuditChanges', () => {
    it('returns an empty array for null or empty changes', () => {
        expect(formatAuditChanges(null)).toEqual([]);
        expect(formatAuditChanges([])).toEqual([]);
    });

    it('formats a field with both a label and a raw from/to as "field: from → to", preferring labels', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [
                { field: 'phaseId', from: 2, fromLabel: 'ToDo', to: 3, toLabel: 'Done' },
            ] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['phaseId: ToDo → Done']);
    });

    it('falls back to the raw value when no label was resolved', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'title', from: 'old', to: 'new' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['title: old → new']);
    });

    it('formats an insert-only field (no "from") as "field: → to"', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'assignee', to: 12, toLabel: 'John Smith' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['assignee: → John Smith']);
    });

    it('formats a delete-only field (no "to") as "field: from →"', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'assignee', from: 7, fromLabel: 'Oleh Teslenko' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual(['assignee: Oleh Teslenko →']);
    });

    it('renders a null value as "none", and stringifies an object value', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [
                { field: 'description', from: null, to: 'new description' },
                { field: 'meta', from: { a: 1 }, to: { a: 2 } },
            ] },
        ];

        expect(formatAuditChanges(changes)).toEqual([
            'description: none → new description',
            'meta: {"a":1} → {"a":2}',
        ]);
    });

    it('flattens fields across multiple entity changes into one line list, in order', () => {
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'phaseId', from: 2, fromLabel: 'ToDo', to: 3, toLabel: 'Done' }] },
            { entityName: 'Notification', entityId: 9, action: 'insert', fields: [{ field: 'title', to: 'You were assigned a task' }] },
        ];

        expect(formatAuditChanges(changes)).toEqual([
            'phaseId: ToDo → Done',
            'title: → You were assigned a task',
        ]);
    });
});

describe('AuditLogChangesRenderComponent', () => {
    it('agInit populates lines from params.value via formatAuditChanges', () => {
        const component = new AuditLogChangesRenderComponent();
        const changes: IAuditEntityChange[] = [
            { entityName: 'Tasks', entityId: 3, action: 'update', fields: [{ field: 'title', from: 'old', to: 'new' }] },
        ];

        component.agInit({ value: changes });

        expect(component.lines).toEqual(['title: old → new']);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `packages/web/`): `npm test -- --include='**/audit-log-changes-render.component.spec.ts' --watch=false`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// audit-log-changes-render.component.ts
// *ngFor in the template below needs CommonModule in scope - it's not
// imported here because this component is declared in TslenComponentsModule
// (standalone: false), which already imports CommonModule for its other
// declarations (see Step 5).
import { Component } from '@angular/core';
import { IAuditEntityChange } from '../../../admin/audit-log/interfaces/audit-log';

export function formatAuditChanges (changes: IAuditEntityChange[] | null): string[] {
    if (!changes || changes.length === 0) {
        return [];
    }
    const lines: string[] = [];
    for (const change of changes) {
        for (const field of change.fields) {
            const from = 'from' in field ? (field.fromLabel ?? formatValue(field.from)) : undefined;
            const to = 'to' in field ? (field.toLabel ?? formatValue(field.to)) : undefined;
            if (from !== undefined && to !== undefined) {
                lines.push(`${field.field}: ${from} → ${to}`);
            } else if (to !== undefined) {
                lines.push(`${field.field}: → ${to}`);
            } else if (from !== undefined) {
                lines.push(`${field.field}: ${from} →`);
            }
        }
    }
    return lines;
}

function formatValue (value: unknown): string {
    if (value === null) {
        return 'none';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

@Component({
    selector: 'app-audit-log-changes-render',
    template: `<div class="audit-log-changes"><div *ngFor="let line of lines">{{ line }}</div></div>`,
    standalone: false,
})
export class AuditLogChangesRenderComponent {
    public lines: string[] = [];

    agInit (params: { value: IAuditEntityChange[] | null }): void {
        this.lines = formatAuditChanges(params.value);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --include='**/audit-log-changes-render.component.spec.ts' --watch=false`
Expected: PASS (8 tests).

- [ ] **Step 5: Register the component in `TslenComponentsModule`**

In `packages/web/src/app/tslen-components/tslen-components.module.ts`:
- Add `import { AuditLogChangesRenderComponent } from './ag-grid/audit-log-changes-render/audit-log-changes-render.component';`
- Add `AuditLogChangesRenderComponent` to the `declarations` array (alongside `InventoryRenderComponent`).

- [ ] **Step 6: Commit**

```bash
cd packages/web
git add src/app/tslen-components/ag-grid/audit-log-changes-render/audit-log-changes-render.component.ts src/app/tslen-components/ag-grid/audit-log-changes-render/audit-log-changes-render.component.spec.ts src/app/tslen-components/tslen-components.module.ts
git commit -m "feat(audit-log): add ag-grid cell renderer formatting the changes array"
```

---

### Task 3: `AuditLogComponent` page

**Files:**
- Create: `packages/web/src/app/admin/audit-log/audit-log.component.ts`
- Create: `packages/web/src/app/admin/audit-log/audit-log.component.html`

**Interfaces:**
- Consumes: `AuditLogService.getAuditLogs()` (Task 1), `AuditLogChangesRenderComponent` (Task 2), the shared `AgGridTableComponent` (`components/ag-grid-table/`, existing).
- Produces: `AuditLogComponent` — referenced by the route added in Task 4.

No dedicated test — matches `InventoryComponent`'s untested shape (no branching logic beyond the column defs, which are declarative data, not behavior). Verified via `ng build` and a manual browser check in Task 4, once the route/nav wiring exists to actually reach this page.

- [ ] **Step 1: Write the component**

```typescript
// audit-log.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsModule } from '../../components/components.module';
import { ColDef } from 'ag-grid-community';
import { Observable, of } from 'rxjs';
import { catchError, startWith } from 'rxjs/operators';
import { AuditLogService } from './services/audit-log.service';
import { IAuditLog } from './interfaces/audit-log';
import { AuditLogChangesRenderComponent } from '../../tslen-components/ag-grid/audit-log-changes-render/audit-log-changes-render.component';

@Component({
    selector: 'app-audit-log',
    imports: [CommonModule, ComponentsModule],
    templateUrl: './audit-log.component.html',
})
export class AuditLogComponent {
    private auditLogService = inject(AuditLogService);

    public rowData: Observable<IAuditLog[]> = this.auditLogService.getAuditLogs().pipe(
        startWith([] as IAuditLog[]),
        catchError(() => of([])),
    );

    public columnDefs: ColDef[] = [
        { field: 'createdAt', headerName: 'When', valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : '' },
        { field: 'userId', headerName: 'User' },
        { field: 'ip', headerName: 'IP' },
        { field: 'method', headerName: 'Method' },
        { field: 'resourceType', headerName: 'Resource' },
        { field: 'resourceId', headerName: 'Resource ID' },
        { field: 'statusCode', headerName: 'Status' },
        { field: 'changes', headerName: 'Changes', cellRenderer: 'auditLogChangesRenderComponent', autoHeight: true, wrapText: true },
    ];

    public components = {
        auditLogChangesRenderComponent: AuditLogChangesRenderComponent,
    };
}
```

- [ ] **Step 2: Write the template**

```html
<!-- audit-log.component.html -->
<div class="custom-table">
    <app-ag-grid-table [columnDefs]="columnDefs"
                       [rowData]="rowData | async"
                       [components]="components"
                       [sizeColumnsToFit]="true"
                       [rowHeight]="43"
                       [headerHeight]="50"
    ></app-ag-grid-table>
</div>
```

- [ ] **Step 3: Commit**

```bash
cd packages/web
git add src/app/admin/audit-log/audit-log.component.ts src/app/admin/audit-log/audit-log.component.html
git commit -m "feat(audit-log): add AuditLogComponent admin page"
```

---

### Task 4: Route, nav entry, and verification

**Files:**
- Modify: `packages/web/src/app/admin/admin-routing.module.ts`
- Modify: `packages/web/src/app/theme/layout/admin/navigation/navigation.ts`

**Interfaces:**
- Consumes: `AuditLogComponent` (Task 3), the existing `RoleGuard` (`guards/role.guard.ts`, unchanged).
- Produces: the reachable `/admin/audit-log` route and its nav entry — nothing downstream depends on this task.

No new unit test (pure routing/config wiring). Verified via `ng build` + a manual browser check — this is a UI change, and per this repo's convention, UI changes get verified in an actual running browser, not just a build pass.

- [ ] **Step 1: Add the route**

In `packages/web/src/app/admin/admin-routing.module.ts`, add to the `children` array (matching the existing lazy `loadComponent` pattern used for `company-rules`):

```typescript
        {
            path: 'audit-log',
            loadComponent: () => import('./audit-log/audit-log.component').then(module => module.AuditLogComponent),
            canActivate: [RoleGuard],
            data: { roles: ['admin'] },
        },
```

Add `import { RoleGuard } from '../guards/role.guard';` at the top of the file (`packages/web/src/app/guards/role.guard.ts`, one level up from `admin/`).

- [ ] **Step 2: Add the nav entry**

In `packages/web/src/app/theme/layout/admin/navigation/navigation.ts`, add a new top-level entry to `NavigationItems` (a sibling of the existing `admin` group, not nested inside it — the existing `admin` group grants `manager: true` too, so an admin-only link needs its own group):

```typescript
  {
    id: 'audit-log-group',
    title: 'Audit Log',
    type: 'group',
    icon: 'feather icon-monitor',
    admin: true,
    children: [
      {
        id: 'audit-log',
        title: 'Audit Log',
        type: 'item',
        url: '/admin/audit-log',
        icon: 'feather icon-list'
      }
    ]
  },
```

Place this immediately after the existing `admin` group's closing `},` (before the final `];`).

- [ ] **Step 3: Build**

Run (from `packages/web/`): `npm run build`
Expected: builds with no TypeScript/template errors.

- [ ] **Step 4: Run the full frontend test suite**

Run (from `packages/web/`): `npm test`
Expected: the new `audit-log-changes-render.component.spec.ts` tests pass. Per `AGENTS.md`, a handful of pre-existing unrelated spec failures (`dash-analytics`, some directive specs) are expected and not connected to this change — confirm via `git stash` if any failure looks like it could be related to files this plan touched.

- [ ] **Step 5: Manual browser verification**

This is a UI change — verify it actually works in a browser, not just that it builds. Reuse the docker-compose stack already set up for backend verification (`docker compose up --build -d postgres app` from the repo root builds the Angular frontend into the same image and serves it via the backend's `ServeStaticModule`):
1. Log in as an admin user (or reuse a previously-minted admin JWT/local storage token from backend testing).
2. Confirm the "Audit Log" nav entry is visible for an admin account and reach `/admin/audit-log`.
3. Confirm it is **not** visible (and the route is blocked) for a manager account.
4. Confirm the grid renders real rows (perform a task mutation first if the table is empty) with a readable "Changes" column.

- [ ] **Step 6: Commit**

```bash
cd packages/web
git add src/app/admin/admin-routing.module.ts src/app/theme/layout/admin/navigation/navigation.ts
git commit -m "feat(audit-log): wire /admin/audit-log route and admin-only nav entry"
```

---

## Self-review notes

- **Spec coverage:** admin-only route/nav (Task 4), ag-grid reuse matching Inventory's pattern exactly (Tasks 1–3), changes-array formatting (Task 2), all covered. Filtering/pagination UI and server-side pagination are explicitly out of scope per the design spec's "Future extensions" section — correctly absent from every task here.
- **Type consistency:** `IAuditEntityChange`/`IAuditFieldChange` (Task 1) match the backend's `AuditEntityChange`/`AuditFieldChange` shape (`src/common/audit-context.storage.ts`) field-for-field, and flow unchanged into `formatAuditChanges` (Task 2) and `AuditLogComponent`'s `rowData` (Task 3).
