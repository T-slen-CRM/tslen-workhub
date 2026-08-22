# Task Detail Dialog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the task detail dialog into a Jira-inspired layout (title +
status pill header, description with a preview/edit toggle, an Activity
section with All/Comments/History tabs, and a right-hand Details sidebar),
and fix two real bugs found in the Assignee field along the way.

**Architecture:** Pure frontend change, one component
(`TaskCreateEditComponent`) plus one shared child
(`AutocompleteComponent`) and five locale files. No backend changes. The
reactive form and its single Save button stay exactly as they are today —
this is a template/SCSS/local-UI-state change, not a data-flow change.

**Tech Stack:** Angular 20 (standalone components, signals), Angular
Material, `@kolkov/angular-editor` (existing rich-text editor), Karma/Jasmine.

**Spec:** `docs/superpowers/specs/2026-08-22-task-detail-dialog-redesign-design.md`

## Global Constraints

- No per-field click-to-edit / auto-save. Every field stays part of the one
  reactive form, committed by the existing Save button.
- No per-status color coding on the phase pill — one consistent accent
  color regardless of which phase is selected (phases are user-defined,
  not a fixed enum).
- Support both the app's existing light and dark themes. The real
  mechanism is `ThemeService.changeThemeColor()` toggling a `.dark-theme`
  class on `<body>` (see `theme.service.ts`) — **not** the `.dark-mode`
  class used locally in `tasks-list.component.scss`/`tasks-manager`, which
  is dead/inconsistent leftover code (its only toggle,
  `app-dark-mode-button`, is commented out in both
  `nav-bar.component.html` and `nav-right.component.html`, so nothing
  ever sets it). Use `:host-context(.dark-theme)`, not `.dark-mode`, and
  do not copy the `.dark-mode` pattern.
- The History tab gets a shell + empty state only in this plan. Real
  history-log entries are a separate spec/plan.
- `AutocompleteComponent` keeps its existing `@Input()`/setter style in
  this plan — only its template's label-visibility bug is fixed. Migrating
  it to signal `input()` would ripple into its two other consumers
  (`task-project-members`, `create-one-event-dialog`) and their setter
  side-effect (`ngOnInit`'s manual selected/unselected list bookkeeping),
  which is out of scope for a template-only bug fix; do not combine that
  migration into this plan.
- Frontend tests: from `packages/web/`, after `nvm use v22.22.2`, use a
  temporary (never committed) headless Karma config per this repo's
  `AGENTS.md` testing section to run specs non-interactively.

---

## Task 1: Fix the Assignee field's translation key and disappearing label

**Files:**
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html`
- Modify: `packages/web/src/app/components/autocomplete/autocomplete/autocomplete.component.html`
- Modify: `packages/web/src/assets/i18n/en.json`, `uk.json`, `fr.json`, `ru.json`, `es.json`
- Test: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts` (new)
- Test: `packages/web/src/app/components/autocomplete/autocomplete/autocomplete.component.spec.ts` (new)

**Interfaces:**
- Produces: `task.form.assignee` translation key in all 5 locale files, used
  going forward by Task 3's sidebar row too.

- [ ] **Step 1: Add the `task.form.assignee` key to all 5 locale files**

In `packages/web/src/assets/i18n/en.json`, inside the existing `task.form`
block (next to `"move_card": "Move card to phase",`), add:
```json
        "assignee": "Assignee",
```

In `uk.json` (2-space indent style, matches that file's existing `task.form` block):
```json
      "assignee": "Виконавець",
```

In `fr.json`:
```json
      "assignee": "Assigné",
```

In `ru.json`:
```json
      "assignee": "Исполнитель",
```

In `es.json`:
```json
      "assignee": "Responsable",
```

- [ ] **Step 2: Write the failing test for the translation-key binding**

Create `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TaskCreateEditComponent } from './task-create-edit.component';
import { AuthenticationService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { TaskWebSocketService } from '../../pages/tasks-list/taskWebSocket.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AutocompleteComponent } from '../../components/autocomplete/autocomplete/autocomplete.component';

describe('TaskCreateEditComponent', () => {
  let component: TaskCreateEditComponent;
  let fixture: ComponentFixture<TaskCreateEditComponent>;

  function configure(data: any) {
    return TestBed.configureTestingModule({
      imports: [TaskCreateEditComponent, TranslateModule.forRoot()],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: data },
        {
          provide: AuthenticationService,
          useValue: { authDataSignal: () => ({ email: 'a@b.com', firstName: 'A', lastName: 'B' }) },
        },
        {
          provide: DataService,
          useValue: jasmine.createSpyObj('DataService', ['getObservableData', 'postData', 'postImage', 'deleteData'], {
          }),
        },
        { provide: TaskWebSocketService, useValue: { getMessages: () => of(null) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'error']) },
      ],
    }).compileComponents();
  }

  const newTaskData = { task: null, projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false };

  beforeEach(async () => {
    await configure(newTaskData);
    fixture = TestBed.createComponent(TaskCreateEditComponent);
    component = fixture.componentInstance;
  });

  it('gives the Assignee autocomplete its own label, not the phase select\'s "Move card" label', () => {
    fixture.detectChanges();

    const autocomplete = fixture.debugElement.query(By.directive(AutocompleteComponent));

    expect(autocomplete.componentInstance.nameOfList).toBe('task.form.assignee');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run (from `packages/web/`, after `nvm use v22.22.2`, using a temporary
headless Karma config):
```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts'
```
Expected: FAIL — `nameOfList` is `'task.form.move_card'`, not
`'task.form.assignee'`.

- [ ] **Step 4: Fix the binding in the template**

In `task-create-edit.component.html`, find:
```html
                    <app-autocomplete (selectedItemsForParent)="getSelectedValues($event)"
                                      [allData]="projectMembers"
                                      [nameOfList]="'task.form.move_card'| translate"
                                      [selectedData]="selectedAssignee">
                    </app-autocomplete>
```
Change `[nameOfList]` to:
```html
                                      [nameOfList]="'task.form.assignee'| translate"
```

- [ ] **Step 5: Run the test to verify it passes**

Same command as Step 3. Expected: PASS.

- [ ] **Step 6: Write the failing test for the label-visibility bug**

Create `packages/web/src/app/components/autocomplete/autocomplete/autocomplete.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AutocompleteComponent } from './autocomplete.component';

describe('AutocompleteComponent', () => {
  let component: AutocompleteComponent;
  let fixture: ComponentFixture<AutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AutocompleteComponent],
      imports: [
        ReactiveFormsModule, MatFormFieldModule, MatChipsModule,
        MatAutocompleteModule, MatIconModule, TranslateModule.forRoot(),
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AutocompleteComponent);
    component = fixture.componentInstance;
    component.nameOfList = 'Assignee';
    component.selectedData = [{ value: 1, group: 'Jane Doe' }];
    fixture.detectChanges();
  });

  it('keeps the label visible once a value is selected, instead of removing it from the DOM', () => {
    const label = fixture.debugElement.query(By.css('mat-label'));

    expect(label).not.toBeNull();
    expect(label.nativeElement.textContent.trim()).toBe('Assignee');
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/autocomplete.component.spec.ts'
```
Expected: FAIL — no `mat-label` element found (selected data is non-empty,
so the `@if` guard removes it).

- [ ] **Step 8: Fix the template**

In `autocomplete.component.html`, change:
```html
    @if (!selectedData.length) {
        <mat-label>{{nameOfList}}</mat-label>
    }
<!--    <mat-label>{{nameOfList}}</mat-label>-->
```
to:
```html
    <mat-label>{{nameOfList}}</mat-label>
```
(removing both the `@if` guard and the dead commented-out duplicate line
directly below it).

- [ ] **Step 9: Run both tests to verify they pass**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts' --include='**/autocomplete.component.spec.ts'
```
Expected: PASS.

- [ ] **Step 10: Spot-check the other two `app-autocomplete` consumers**

Open `task-project-members.component.html` and
`create-one-event-dialog.component.html` (both use `<app-autocomplete>`)
in a running `ng serve` and confirm the label still looks correct once a
value is selected in each — this fix is shared by all three call sites.

- [ ] **Step 11: Commit**

```bash
git add packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts packages/web/src/app/components/autocomplete/autocomplete/autocomplete.component.html packages/web/src/app/components/autocomplete/autocomplete/autocomplete.component.spec.ts packages/web/src/assets/i18n/en.json packages/web/src/assets/i18n/uk.json packages/web/src/assets/i18n/fr.json packages/web/src/assets/i18n/ru.json packages/web/src/assets/i18n/es.json
git commit -m "fix(tasks): correct the Assignee field's label and translation key"
```

---

## Task 2: Description preview/edit toggle with collapse

**Files:**
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.ts`
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html`
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.scss`
- Modify: `packages/web/src/assets/i18n/en.json`, `uk.json`, `fr.json`, `ru.json`, `es.json`
- Test: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts`

**Interfaces:**
- Consumes: `DomSanitizer.bypassSecurityTrustHtml` (same pattern as
  `posts.component.ts`'s `safeHtml`).
- Produces: `descriptionEditing: WritableSignal<boolean>`,
  `descriptionExpanded: WritableSignal<boolean>`,
  `descriptionOverflowing: WritableSignal<boolean>`,
  `safeDescriptionHtml(): SafeHtml` — consumed by Task 3 when it moves this
  block into the new main-column layout.

- [ ] **Step 1: Add the i18n keys**

Add to `en.json`'s `task.form` block:
```json
        "description_edit": "Edit",
        "description_done": "Done",
        "show_more": "Show more",
        "show_less": "Show less",
```
`uk.json`:
```json
      "description_edit": "Редагувати",
      "description_done": "Готово",
      "show_more": "Показати більше",
      "show_less": "Показати менше",
```
`fr.json`:
```json
      "description_edit": "Modifier",
      "description_done": "Terminé",
      "show_more": "Afficher plus",
      "show_less": "Afficher moins",
```
`ru.json`:
```json
      "description_edit": "Редактировать",
      "description_done": "Готово",
      "show_more": "Показать больше",
      "show_less": "Показать меньше",
```
`es.json`:
```json
      "description_edit": "Editar",
      "description_done": "Listo",
      "show_more": "Mostrar más",
      "show_less": "Mostrar menos",
```

- [ ] **Step 2: Write the failing tests**

Add to `task-create-edit.component.spec.ts` (new `describe` block, reusing
the `configure()` helper from Task 1):

```typescript
  describe('description preview/edit toggle', () => {
    it('starts in edit mode for a new task (no description yet)', async () => {
      await configure(newTaskData);
      fixture = TestBed.createComponent(TaskCreateEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.descriptionEditing()).toBeTrue();
    });

    it('starts in preview mode for an existing task that already has a description', async () => {
      const existingTaskData = {
        task: { id: 7, title: 'Existing', description: '<p>Some description</p>', taskUserAssignmentRelations: [] },
        projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false,
      };
      await configure(existingTaskData);
      fixture = TestBed.createComponent(TaskCreateEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.descriptionEditing()).toBeFalse();
    });

    it('toggles into edit mode and back to preview via the explicit Edit/Done toggle, without touching the form value', async () => {
      const existingTaskData = {
        task: { id: 7, title: 'Existing', description: '<p>Some description</p>', taskUserAssignmentRelations: [] },
        projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false,
      };
      await configure(existingTaskData);
      fixture = TestBed.createComponent(TaskCreateEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.descriptionEditing.set(true);
      expect(component.descriptionEditing()).toBeTrue();
      expect(component.form.get('description').value).toBe('<p>Some description</p>');

      component.descriptionEditing.set(false);
      expect(component.descriptionEditing()).toBeFalse();
      expect(component.form.get('description').value).toBe('<p>Some description</p>');
    });

    it('renders the stored description HTML through the sanitizer for preview', async () => {
      const existingTaskData = {
        task: { id: 7, title: 'Existing', description: '<p>Hi</p>', taskUserAssignmentRelations: [] },
        projectMembers: [], phaseList: [{ id: 1, name: 'To Do' }], slackChannelAlert: false,
      };
      await configure(existingTaskData);
      fixture = TestBed.createComponent(TaskCreateEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const safe = component.safeDescriptionHtml();

      expect(safe).toBeTruthy();
    });
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts'
```
Expected: FAIL — `descriptionEditing`, `safeDescriptionHtml` don't exist yet.

- [ ] **Step 4: Add the signals, sanitizer, and overflow-detection logic**

In `task-create-edit.component.ts`, add imports:
```typescript
import { Component, Inject, OnInit, AfterViewChecked, ViewChild, ElementRef, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
```
(merge with the existing `@angular/core` import line rather than
duplicating it).

Add to the class body:
```typescript
  public descriptionEditing = signal<boolean>(false);
  public descriptionExpanded = signal<boolean>(false);
  public descriptionOverflowing = signal<boolean>(false);
  @ViewChild('descriptionPreviewEl') descriptionPreviewEl?: ElementRef<HTMLElement>;
```
Add `private sanitizer: DomSanitizer` to the constructor's parameter list
(alongside the existing `private toastr: ToastrService`).

Add methods:
```typescript
  safeDescriptionHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.form.get('description').value ?? '');
  }

  ngAfterViewChecked(): void {
    if (this.descriptionEditing() || this.descriptionExpanded() || !this.descriptionPreviewEl) {
      return;
    }
    const el = this.descriptionPreviewEl.nativeElement;
    const isOverflowing = el.scrollHeight > el.clientHeight;
    if (isOverflowing !== this.descriptionOverflowing()) {
      this.descriptionOverflowing.set(isOverflowing);
    }
  }
```
Add `AfterViewChecked` to the `export class TaskCreateEditComponent
implements OnInit` clause (`implements OnInit, AfterViewChecked`).

At the end of `ngOnInit()` (after the existing `if (this.incomingProject
&& ...)` block), add:
```typescript
    this.descriptionEditing.set(!this.form.get('description').value);
```

- [ ] **Step 5: Update the template**

In `task-create-edit.component.html`, replace:
```html
                <div >
                    <mat-label>{{'task.form.description' | translate}}</mat-label>
                    <app-text-editor formControlName="description" [customEditorConfig]="textEditorConfig"></app-text-editor>
                </div>
```
with:
```html
                <div class="description-block">
                    <mat-label>{{'task.form.description' | translate}}</mat-label>
                    @if (descriptionEditing()) {
                        <app-text-editor formControlName="description" [customEditorConfig]="textEditorConfig"></app-text-editor>
                        <button type="button" class="description-toggle-btn" (click)="descriptionEditing.set(false)">
                            {{'task.form.description_done' | translate}}
                        </button>
                    } @else {
                        <div #descriptionPreviewEl
                             class="description-preview"
                             [class.description-preview-expanded]="descriptionExpanded()"
                             [innerHTML]="safeDescriptionHtml()">
                        </div>
                        @if (descriptionOverflowing() || descriptionExpanded()) {
                            <button type="button" class="description-collapse-btn" (click)="descriptionExpanded.set(!descriptionExpanded())">
                                {{ (descriptionExpanded() ? 'task.form.show_less' : 'task.form.show_more') | translate }}
                            </button>
                        }
                        <button type="button" class="description-toggle-btn" (click)="descriptionEditing.set(true)">
                            {{'task.form.description_edit' | translate}}
                        </button>
                    }
                </div>
```

- [ ] **Step 6: Add the preview collapse CSS**

In `task-create-edit.component.scss`, add:
```scss
.description-preview {
  max-height: 150px;
  overflow: hidden;
  line-height: 1.5;

  &.description-preview-expanded {
    max-height: none;
  }
}
.description-toggle-btn,
.description-collapse-btn {
  background: none;
  border: none;
  color: var(--bs-primary, #1389eb);
  cursor: pointer;
  padding: 4px 0;
  font-size: 0.875rem;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts'
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.ts packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.scss packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts packages/web/src/assets/i18n/en.json packages/web/src/assets/i18n/uk.json packages/web/src/assets/i18n/fr.json packages/web/src/assets/i18n/ru.json packages/web/src/assets/i18n/es.json
git commit -m "feat(tasks): add preview/edit toggle with collapse for task description"
```

---

## Task 3: Jira-style layout — header, sidebar, and Activity tabs shell

**Files:**
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.ts`
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html`
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.scss`
- Modify: `packages/web/src/assets/i18n/en.json`, `uk.json`, `fr.json`, `ru.json`, `es.json`
- Test: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts`

**Interfaces:**
- Consumes: `descriptionEditing`/`descriptionExpanded`/`descriptionOverflowing`/`safeDescriptionHtml()` (Task 2), the fixed `task.form.assignee` binding (Task 1).
- Produces: `activeActivityTab: WritableSignal<'all' | 'comments' | 'history'>`.

- [ ] **Step 1: Add the i18n keys**

Add to `en.json`'s `task.form` block:
```json
        "created_by": "Created by",
        "activity": "Activity",
        "activity_all": "All",
        "activity_comments": "Comments",
        "activity_history": "History",
        "activity_history_empty": "No history yet.",
        "activity_new_task": "Activity will be available after this task is created.",
```
`uk.json`:
```json
      "created_by": "Створив(ла)",
      "activity": "Активність",
      "activity_all": "Усі",
      "activity_comments": "Коментарі",
      "activity_history": "Історія",
      "activity_history_empty": "Історії поки немає.",
      "activity_new_task": "Активність буде доступна після створення цього завдання.",
```
`fr.json`:
```json
      "created_by": "Créé par",
      "activity": "Activité",
      "activity_all": "Tout",
      "activity_comments": "Commentaires",
      "activity_history": "Historique",
      "activity_history_empty": "Aucun historique pour l'instant.",
      "activity_new_task": "L'activité sera disponible une fois cette tâche créée.",
```
`ru.json`:
```json
      "created_by": "Создал(а)",
      "activity": "Активность",
      "activity_all": "Все",
      "activity_comments": "Комментарии",
      "activity_history": "История",
      "activity_history_empty": "Истории пока нет.",
      "activity_new_task": "Активность будет доступна после создания этой задачи.",
```
`es.json`:
```json
      "created_by": "Creado por",
      "activity": "Actividad",
      "activity_all": "Todo",
      "activity_comments": "Comentarios",
      "activity_history": "Historial",
      "activity_history_empty": "Aún no hay historial.",
      "activity_new_task": "La actividad estará disponible una vez creada esta tarea.",
```

- [ ] **Step 2: Write the failing test for the Activity tabs**

Add to `task-create-edit.component.spec.ts`:

```typescript
  describe('Activity tabs', () => {
    it('defaults to the "all" tab', async () => {
      await configure(newTaskData);
      fixture = TestBed.createComponent(TaskCreateEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.activeActivityTab()).toBe('all');
    });

    it('switches tabs without affecting the form', async () => {
      await configure(newTaskData);
      fixture = TestBed.createComponent(TaskCreateEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.activeActivityTab.set('history');

      expect(component.activeActivityTab()).toBe('history');
      expect(component.form.get('title').value).toBe('');
    });
  });
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts'
```
Expected: FAIL — `activeActivityTab` doesn't exist yet.

- [ ] **Step 4: Add the tab signal**

In `task-create-edit.component.ts`, add to the class body:
```typescript
  public activeActivityTab = signal<'all' | 'comments' | 'history'>('all');
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts'
```
Expected: PASS.

- [ ] **Step 6: Rebuild the template around the new layout**

Replace the whole `<div class="task-card">...</div>` block in
`task-create-edit.component.html` (everything between
`<mat-dialog-content class="mat-typography">` and its closing
`</mat-dialog-content>`) with:

```html
        <div class="task-dialog">
            <div class="task-dialog-header">
                <mat-form-field class="title-field" appearance="outline">
                    <input matInput
                           type="text"
                           [placeholder]="'task.form.placeholder'| translate"
                           formControlName="title"
                    />
                </mat-form-field>
                <mat-form-field class="phase-pill-field" appearance="outline">
                    <mat-select formControlName="phaseId">
                        <mat-option *ngFor="let phase of data.phaseList" [value]="phase.id">
                            {{phase.name}}
                        </mat-option>
                    </mat-select>
                </mat-form-field>
            </div>

            <div class="task-dialog-body">
                <div class="task-dialog-main">
                    <div class="description-block">
                        <mat-label>{{'task.form.description' | translate}}</mat-label>
                        @if (descriptionEditing()) {
                            <app-text-editor formControlName="description" [customEditorConfig]="textEditorConfig"></app-text-editor>
                            <button type="button" class="description-toggle-btn" (click)="descriptionEditing.set(false)">
                                {{'task.form.description_done' | translate}}
                            </button>
                        } @else {
                            <div #descriptionPreviewEl
                                 class="description-preview"
                                 [class.description-preview-expanded]="descriptionExpanded()"
                                 [innerHTML]="safeDescriptionHtml()">
                            </div>
                            @if (descriptionOverflowing() || descriptionExpanded()) {
                                <button type="button" class="description-collapse-btn" (click)="descriptionExpanded.set(!descriptionExpanded())">
                                    {{ (descriptionExpanded() ? 'task.form.show_less' : 'task.form.show_more') | translate }}
                                </button>
                            }
                            <button type="button" class="description-toggle-btn" (click)="descriptionEditing.set(true)">
                                {{'task.form.description_edit' | translate}}
                            </button>
                        }
                    </div>

                    <div class="activity-section">
                        <h4 class="activity-heading">{{'task.form.activity' | translate}}</h4>
                        <div class="activity-tabs">
                            <button type="button" class="activity-tab" [class.active]="activeActivityTab() === 'all'" (click)="activeActivityTab.set('all')">
                                {{'task.form.activity_all' | translate}}
                            </button>
                            <button type="button" class="activity-tab" [class.active]="activeActivityTab() === 'comments'" (click)="activeActivityTab.set('comments')">
                                {{'task.form.activity_comments' | translate}}
                            </button>
                            <button type="button" class="activity-tab" [class.active]="activeActivityTab() === 'history'" (click)="activeActivityTab.set('history')">
                                {{'task.form.activity_history' | translate}}
                            </button>
                        </div>
                        @if (taskId) {
                            @if (activeActivityTab() !== 'history') {
                                <app-task-comments [taskId]="taskId"></app-task-comments>
                            } @else {
                                <div class="activity-empty-state">{{'task.form.activity_history_empty' | translate}}</div>
                            }
                        } @else {
                            <div class="activity-empty-state">{{'task.form.activity_new_task' | translate}}</div>
                        }
                    </div>
                </div>

                <div class="task-dialog-sidebar">
                    <div class="sidebar-row">
                        <span class="sidebar-label">{{'task.form.assignee' | translate}}</span>
                        <app-autocomplete (selectedItemsForParent)="getSelectedValues($event)"
                                          [allData]="projectMembers"
                                          [nameOfList]="'task.form.assignee'| translate"
                                          [selectedData]="selectedAssignee">
                        </app-autocomplete>
                    </div>

                    <div class="sidebar-row">
                        <span class="sidebar-label">{{'task.form.priority'| translate}}</span>
                        <mat-form-field class="input-mat-select" appearance="outline">
                            <mat-select formControlName="priority">
                                <mat-option *ngFor="let priority of priorityList" [value]="priority.value">
                                    {{priority.viewValue}}
                                </mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>

                    <div class="sidebar-row">
                        <span class="sidebar-label">{{"task.form.estimate" | translate}}</span>
                        <mat-form-field class="input-mat-select" appearance="outline">
                            <input matInput [matDatepicker]="picker1" formControlName="estimate">
                            <mat-datepicker-toggle matSuffix [for]="picker1"></mat-datepicker-toggle>
                            @if (form.get('estimate').value) {
                                <mat-icon matSuffix
                                          (click)="resetEstimate()"
                                          class="btn-remove-estimate"
                                >remove</mat-icon>
                            }
                            <mat-datepicker #picker1></mat-datepicker>
                        </mat-form-field>
                    </div>

                    @if (incomingProject?.createdByName) {
                        <div class="sidebar-row">
                            <span class="sidebar-label">{{'task.form.created_by' | translate}}</span>
                            <span class="sidebar-value">{{incomingProject.createdByName}}</span>
                        </div>
                    }

                    <div class="sidebar-row">
                        <span class="sidebar-label">{{'task.form.upload attachments'| translate}}</span>
                        <app-upload-files
                                formControlName="taskAttachments"
                                [uploadLabel]="'task.form.upload attachments'| translate"
                                [params]="{id: null}"
                                [multipleSelection]="true"
                                [acceptedFileTypes]="acceptedFileTypes"
                                [uploadLimit]="uploadLimit"
                        ></app-upload-files>
                        @if(attachments && attachments?.length > 0) {
                            <mat-selection-list [multiple]="false">
                                <mat-list-option *ngFor="let files of attachments" [value]="[files.url, files.originName]">
                                    <span class="d-flex">
                                        <span (click)="openPreview(files.url)" class="mr-auto p-2">{{files.originName}}</span>
                                        <span (click)="deleteAttachment(files.id)" class="p-2 custom-icon-delete"><mat-icon>delete_forever</mat-icon></span>
                                    </span>
                                </mat-list-option>
                            </mat-selection-list>
                        }
                    </div>
                </div>
            </div>
        </div>
```

Note this drops the old `<div>` wrapping `app-task-comments` at the bottom
of the settings column — comments now live inside the Activity tabs
(`activeActivityTab() !== 'history'` branch above), not as a separate
always-visible block.

- [ ] **Step 7: Rewrite the SCSS for the new layout**

Replace the contents of `task-create-edit.component.scss`'s `.task-card`
block (and everything below it) with:

```scss
.task-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.task-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  .title-field {
    flex: 1;
    ::ng-deep .mat-mdc-text-field-wrapper {
      font-size: 1.25rem;
    }
  }
  .phase-pill-field {
    width: 200px;
    flex-shrink: 0;
  }
}
.task-dialog-body {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  .task-dialog-main {
    width: 60%;
  }
  .task-dialog-sidebar {
    width: 37%;
    background-color: #f4f5fa;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
:host-context(.dark-theme) .task-dialog-sidebar {
  background-color: color.adjust(#122442, $lightness: -2%, $space: hsl);
}
.sidebar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  .sidebar-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #6d7c87;
  }
  .sidebar-value {
    font-size: 0.9rem;
  }
  .input-mat-select {
    width: 100%;
  }
}
.activity-section {
  margin-top: 24px;
  .activity-heading {
    margin-bottom: 8px;
  }
  .activity-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid #dadada;
    margin-bottom: 12px;
    .activity-tab {
      background: none;
      border: none;
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      &.active {
        border-bottom-color: var(--bs-primary, #1389eb);
        font-weight: 600;
      }
    }
  }
  .activity-empty-state {
    color: #6d7c87;
    font-size: 0.875rem;
    padding: 12px 0;
  }
}
```

Add `@use "sass:color";` as the very first line of the file — confirmed
required per-file (not global): `tasks-list.component.scss`, which also
uses `color.adjust`, declares this same `@use` line at its own top rather
than relying on any global `angular.json` styles config.

Keep the pre-existing rules above `.task-card` (`.input-mat-select`,
`.dialog-action-button`, `.mat-pseudo-checkbox`, `.custom-icon-delete`,
`.mat-list-option .mat-pseudo-checkbox`, `.custom-checkbox
.mat-checkbox-frame`) — only the `.task-card` block itself and everything
below it gets replaced.

- [ ] **Step 8: Run the full component spec suite**

```bash
npx ng test --karma-config=karma.headless.conf.js --include='**/task-create-edit.component.spec.ts' --include='**/autocomplete.component.spec.ts'
```
Expected: PASS (all tests from Tasks 1–3).

- [ ] **Step 9: Run a production build**

```bash
npx ng build --configuration production
```
Expected: builds clean (pre-existing CommonJS-dependency warnings for
`apexcharts`/`lodash`/`file-saver`/`screenfull` are unrelated and expected,
per prior sessions in this repo).

- [ ] **Step 10: Commit**

```bash
git add packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.ts packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.scss packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.spec.ts packages/web/src/assets/i18n/en.json packages/web/src/assets/i18n/uk.json packages/web/src/assets/i18n/fr.json packages/web/src/assets/i18n/ru.json packages/web/src/assets/i18n/es.json
git commit -m "feat(tasks): rebuild task detail dialog into Jira-style layout"
```

---

## Task 4: Manual end-to-end verification

**Files:** None — verification only.

**Interfaces:** None.

- [ ] **Step 1: Verify the new layout for an existing task**

Run the app (`npm run start:dev` + `cd packages/web && npm start`), open a
task that already has a description longer than a few lines.

Expected:
- Title, phase pill, description preview (collapsed with "Show more"),
  Activity tabs, and the Details sidebar (Assignee, Priority, Estimate,
  Created by, Attachments) all render without console errors.
- Clicking "Show more" expands the description preview in place; "Show
  less" collapses it back.
- Clicking "Edit" switches to the rich-text editor; typing updates live;
  clicking "Done" returns to preview showing the edited (unsaved) content.
- Clicking Save persists the edited description, and reopening the task
  shows it correctly in preview mode.
- Switching between the `All`/`Comments`/`History` tabs works; `History`
  shows the empty-state message; `All`/`Comments` both show the existing
  comment list and posting a new comment still works.
- The Assignee field shows "Assignee" as its label (not "Move card to
  phase"), and the label stays visible once an assignee is picked.

- [ ] **Step 2: Verify a new task**

Click "Create a card" on the board. Expected: description opens directly
in edit mode (nothing to preview yet); Activity section shows the
"Activity will be available after this task is created" message instead
of tabs; saving creates the task normally.

- [ ] **Step 3: Verify dark mode**

The dark-theme toggle button (`app-dark-mode-button`) is currently
commented out everywhere in the nav, so there's no live UI control for
this. Instead, open the browser devtools console on the running app and
run:
```js
document.body.classList.add('dark-theme')
```
then repeat a quick pass of Step 1. Expected: sidebar background, activity
tab underline, and text colors all remain legible — no unstyled/invisible
elements. Run `document.body.classList.remove('dark-theme')` afterward to
restore light mode.

- [ ] **Step 4: Verify the other two `app-autocomplete` consumers**

Open the dialogs that use `task-project-members.component.html` and
`create-one-event-dialog.component.html`, select a value in each
autocomplete, and confirm the label still displays correctly (this is the
shared-component fix from Task 1, re-verified here in context).

- [ ] **Step 5: Verify all 5 locales**

Switch the app's language (however it's switched elsewhere in this app)
through each of `en`/`uk`/`fr`/`ru`/`es` and confirm the new strings
(Assignee, Edit/Done, Show more/less, Created by, Activity/All/Comments/
History and its empty states) render as real translated text, not raw
keys.

- [ ] **Step 6: Report findings**

If anything above doesn't match, report it back rather than silently
reworking the design — some of these are judgment calls (e.g. the 150px
collapse threshold) that may need a follow-up tweak once seen live.
