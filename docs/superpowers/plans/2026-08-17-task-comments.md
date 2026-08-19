# Task Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user post a plain-text, immutable comment on a task and read the task's comment thread, so discussion/decisions/LGTM notes can live on the ticket instead of Slack.

**Architecture:** A new top-level backend resource module `task-comments` (entity + repository + service + controller, following the existing `task-phase` module shape exactly) exposing `GET /task-comments?taskId=` and `POST /task-comments`. A new standalone Angular component `TaskCommentsComponent` fetches and posts comments via the existing generic `DataService` methods, and is mounted inside the existing task edit dialog once a task has an id.

**Tech Stack:** NestJS + TypeORM + PostgreSQL (backend), Angular 17 standalone components + signals (frontend), Jest (backend tests), Karma/Jasmine (frontend tests).

**Spec:** `docs/superpowers/specs/2026-08-17-task-comments-design.md`

## Global Constraints

- Node >= 22 required for backend commands: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0` before any `npm`/`npx` backend command (see AGENTS.md).
- Conventional Commits, no `Co-Authored-By` trailer, no Jira prefix (see AGENTS.md).
- Comments are immutable (no edit/delete), plain text only, no attachments, any authenticated user can read/write, no live WebSocket delivery, no notification-on-comment — all per spec's "Out of scope" list. Do not add any of these.
- `userId` on a comment always comes from the authenticated `@User()` decorator server-side — never from client input.
- Every new function gets a real test that exercises actual behavior (mock only the injected dependency, never the method under test — see `test/unit/resources/google-calendar/google-calendar.repository.unit.spec.ts` for the target style, not `test/unit/resources/task-phase/task-phase.controller.unit.spec.ts`, which self-mocks and should not be copied).

---

### Task 1: `TaskComment` entity + migration

**Files:**
- Create: `src/resources/tasks/entities/task-comment.entity.ts`
- Create: `migrations/add-task-comments-table/1786973000000-AddTaskCommentsTable.ts`

**Interfaces:**
- Produces: `TaskComment` class with fields `id: number`, `taskId: number | null`, `userId: number | null`, `content: string`, `createdAt: Date`, `task: Tasks`, `user: Users`.

- [ ] **Step 1: Create the entity**

```ts
// src/resources/tasks/entities/task-comment.entity.ts
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { Tasks } from './task.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseAbstractEntity } from '../../../common/entities/base/base.abstract.entity';

@Index("taskComments_tasks_id_fk", ["taskId"], {})
@Index("taskComments_users_id_fk", ["userId"], {})
@Entity("taskComments")
export class TaskComment extends BaseAbstractEntity<TaskComment> {
    constructor (entity: Partial<TaskComment>) {
        super(entity);
    }

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

This is a unidirectional `ManyToOne` to `Tasks` (no inverse
`taskComments` field added to `Tasks`) — see the spec's "relation vs
separate resource" section for why: an inverse relation would risk
someone eager-loading comments through `Tasks` queries later.

- [ ] **Step 2: Create the migration**

```ts
// migrations/add-task-comments-table/1786973000000-AddTaskCommentsTable.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskCommentsTable1786973000000 implements MigrationInterface {
    name = 'AddTaskCommentsTable1786973000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "taskComments" (
                "id" SERIAL NOT NULL,
                "taskId" integer,
                "userId" integer,
                "content" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_taskComments_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_taskComments_taskId" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_taskComments_userId" FOREIGN KEY ("userId") REFERENCES "users"("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "taskComments_tasks_id_fk" ON "taskComments" ("taskId")`);
        await queryRunner.query(`CREATE INDEX "taskComments_users_id_fk" ON "taskComments" ("userId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "taskComments_users_id_fk"`);
        await queryRunner.query(`DROP INDEX "taskComments_tasks_id_fk"`);
        await queryRunner.query(`DROP TABLE "taskComments"`);
    }
}
```

(Confirmed table names: `Users` → `"users"`, `Tasks` → `"tasks"`,
already reflected in the `REFERENCES` clauses above.)

Nothing imports either file yet, so there's no independent way to
compile-check them in isolation here (plain `npx tsc --noEmit -p
tsconfig.json` is not viable in this repo — with no `include`/
`exclude` in `tsconfig.json`, it sweeps in
`packages/web/node_modules` and fails on unrelated frontend typings;
this project never runs a whole-repo `tsc` pass, only per-file
ts-jest compilation and `nest build`). Task 2 imports `TaskComment`
into real, test-covered code, which is where a real compile check
happens naturally — don't add a step here that doesn't actually
verify anything.

- [ ] **Step 3: Commit**

```bash
git add src/resources/tasks/entities/task-comment.entity.ts migrations/add-task-comments-table/
git commit -m "feat(task-comments): add TaskComment entity and migration"
```

---

### Task 2: `TaskCommentsRepository` + `TaskCommentsService`

**Files:**
- Create: `src/resources/task-comments/task-comments.repository.ts`
- Create: `src/resources/task-comments/task-comments.service.ts`
- Test: `test/unit/resources/task-comments/task-comments.service.unit.spec.ts`

**Interfaces:**
- Consumes: `TaskComment` entity (Task 1).
- Produces: `TaskCommentsRepository.findByTaskId(taskId: number): Promise<TaskComment[]>`; `TaskCommentsService.findByTask(taskId: number): Promise<TaskComment[]>`. Both later consumed by the controller in Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/resources/task-comments/task-comments.service.unit.spec.ts
import { TestBed } from '@automock/jest';
import { TaskCommentsService } from '../../../../src/resources/task-comments/task-comments.service';
import { TaskCommentsRepository } from '../../../../src/resources/task-comments/task-comments.repository';
import { TaskComment } from '../../../../src/resources/tasks/entities/task-comment.entity';

describe('TaskCommentsService', () => {
    let service: TaskCommentsService;
    let repository: jest.Mocked<TaskCommentsRepository>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskCommentsService).compile();
        service = unit;
        repository = unitRef.get(TaskCommentsRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findByTask', () => {
        it('delegates to the repository, keyed by taskId', async () => {
            const comments = [{ id: 1, taskId: 5, content: 'hi' }] as TaskComment[];
            repository.findByTaskId.mockResolvedValue(comments);

            const result = await service.findByTask(5);

            expect(repository.findByTaskId).toHaveBeenCalledWith(5);
            expect(result).toBe(comments);
        });
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-comments`
Expected: FAIL — `Cannot find module '../../../../src/resources/task-comments/task-comments.service'` (neither file exists yet).

- [ ] **Step 3: Write the repository**

```ts
// src/resources/task-comments/task-comments.repository.ts
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskComment } from '../tasks/entities/task-comment.entity';

export class TaskCommentsRepository extends BaseAbstractRepository<TaskComment> {
    constructor (
        @InjectRepository(TaskComment)
        private readonly taskCommentsRepository: Repository<TaskComment>
    ) {
        super(taskCommentsRepository);
    }

    findByTaskId (taskId: number): Promise<TaskComment[]> {
        return this.taskCommentsRepository.find({
            where: { taskId },
            order: { createdAt: 'ASC' },
        });
    }
}
```

- [ ] **Step 4: Write the service**

```ts
// src/resources/task-comments/task-comments.service.ts
import { Injectable } from '@nestjs/common';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { TaskCommentsRepository } from './task-comments.repository';

@Injectable()
export class TaskCommentsService extends BaseAbstractService<TaskComment> {
    constructor (
        protected readonly repository: TaskCommentsRepository
    ) {
        super(repository, null);
        this.currentRepository = repository;
    }

    findByTask (taskId: number): Promise<TaskComment[]> {
        return this.repository.findByTaskId(taskId);
    }
}
```

(`super(repository, null)` for the unused `errorService` param
matches the existing sibling module `TaskPhaseService` — see
`src/resources/task-phase/task-phase.service.ts`.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-comments`
Expected: PASS, 2 tests (`should be defined`, `findByTask ... delegates`).

- [ ] **Step 6: Commit**

```bash
git add src/resources/task-comments/task-comments.repository.ts src/resources/task-comments/task-comments.service.ts test/unit/resources/task-comments/task-comments.service.unit.spec.ts
git commit -m "feat(task-comments): add repository and service"
```

---

### Task 3: `CreateTaskCommentDto` + `TaskCommentsController`

**Files:**
- Create: `src/resources/task-comments/dto/create-task-comment.dto.ts`
- Create: `src/resources/task-comments/task-comments.controller.ts`
- Test: `test/unit/resources/task-comments/create-task-comment.dto.unit.spec.ts`
- Test: `test/unit/resources/task-comments/task-comments.controller.unit.spec.ts`

**Interfaces:**
- Consumes: `TaskCommentsService.findByTask` (Task 2), `TaskCommentsService.create` (inherited from `BaseAbstractService`, Task 2), `User` decorator (`src/resources/users/decorators/user.decorator.ts`), `Users` entity.
- Produces: `GET /task-comments?taskId=` and `POST /task-comments` HTTP routes, later wired into `TaskCommentsModule` (Task 4).

- [ ] **Step 1: Write the failing DTO test**

```ts
// test/unit/resources/task-comments/create-task-comment.dto.unit.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskCommentDto } from '../../../../src/resources/task-comments/dto/create-task-comment.dto';

describe('CreateTaskCommentDto', () => {
    it('rejects empty content', async () => {
        const dto = plainToInstance(CreateTaskCommentDto, { taskId: 1, content: '' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'content')).toBe(true);
    });

    it('accepts a valid payload', async () => {
        const dto = plainToInstance(CreateTaskCommentDto, { taskId: 1, content: 'looks good' });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-comments/create-task-comment.dto.unit.spec.ts`
Expected: FAIL — module not found (DTO doesn't exist yet).

- [ ] **Step 3: Write the DTO**

```ts
// src/resources/task-comments/dto/create-task-comment.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTaskCommentDto {
    @IsNumber()
        taskId: number;

    @IsString()
    @IsNotEmpty()
        content: string;
}
```

- [ ] **Step 4: Run the DTO test to verify it passes**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-comments/create-task-comment.dto.unit.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the failing controller test**

```ts
// test/unit/resources/task-comments/task-comments.controller.unit.spec.ts
import { TestBed } from '@automock/jest';
import { TaskCommentsController } from '../../../../src/resources/task-comments/task-comments.controller';
import { TaskCommentsService } from '../../../../src/resources/task-comments/task-comments.service';
import { TaskComment } from '../../../../src/resources/tasks/entities/task-comment.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('TaskCommentsController', () => {
    let controller: TaskCommentsController;
    let service: jest.Mocked<TaskCommentsService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskCommentsController).compile();
        controller = unit;
        service = unitRef.get(TaskCommentsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('lists comments for the given taskId via the service', async () => {
            const comments = [{ id: 1, taskId: 5, content: 'hi' }] as TaskComment[];
            service.findByTask.mockResolvedValue(comments);

            const result = await controller.findAll(5);

            expect(service.findByTask).toHaveBeenCalledWith(5);
            expect(result).toBe(comments);
        });
    });

    describe('create', () => {
        it('sets userId from the authenticated user, not the client body', async () => {
            const created = { id: 1, taskId: 5, userId: 1, content: 'hi' } as TaskComment;
            service.create.mockResolvedValue(created);

            const result = await controller.create({ taskId: 5, content: 'hi' }, mockUser as Users);

            expect(service.create).toHaveBeenCalledWith({ taskId: 5, content: 'hi', userId: mockUser.id });
            expect(result).toBe(created);
        });
    });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-comments/task-comments.controller.unit.spec.ts`
Expected: FAIL — module not found (controller doesn't exist yet).

- [ ] **Step 7: Write the controller**

```ts
// src/resources/task-comments/task-comments.controller.ts
import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { TaskComment } from '../tasks/entities/task-comment.entity';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';

@Controller('task-comments')
export class TaskCommentsController {
    constructor (private readonly taskCommentsService: TaskCommentsService) {}

    @Get()
    findAll (@Query('taskId', ParseIntPipe) taskId: number): Promise<TaskComment[]> {
        return this.taskCommentsService.findByTask(taskId);
    }

    @Post()
    create (
        @Body() createTaskCommentDto: CreateTaskCommentDto,
        @User() user: Users,
    ): Promise<TaskComment> {
        return this.taskCommentsService.create({
            taskId: createTaskCommentDto.taskId,
            content: createTaskCommentDto.content,
            userId: user.id,
        });
    }
}
```

- [ ] **Step 8: Run the controller test to verify it passes**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest-unit.json test/unit/resources/task-comments`
Expected: PASS, all 6 tests across the `task-comments` directory so far.

- [ ] **Step 9: Commit**

```bash
git add src/resources/task-comments/dto/create-task-comment.dto.ts src/resources/task-comments/task-comments.controller.ts test/unit/resources/task-comments/create-task-comment.dto.unit.spec.ts test/unit/resources/task-comments/task-comments.controller.unit.spec.ts
git commit -m "feat(task-comments): add create DTO and controller"
```

---

### Task 4: `TaskCommentsModule` wiring

**Files:**
- Create: `src/resources/task-comments/task-comments.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `TaskComment` (Task 1), `TaskCommentsRepository`/`TaskCommentsService` (Task 2), `TaskCommentsController` (Task 3).
- Produces: the module registered in `AppModule`, making the routes live.

- [ ] **Step 1: Write the module**

```ts
// src/resources/task-comments/task-comments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskComment } from '../tasks/entities/task-comment.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TaskComment])],
    controllers: [TaskCommentsController],
    providers: [
        TaskCommentsService,
        TaskCommentsRepository
    ],
})
export class TaskCommentsModule {}
```

- [ ] **Step 2: Wire it into `AppModule`**

In `src/app.module.ts`, change:

```ts
import { TaskPhaseModule } from './resources/task-phase/task-phase.module';
import { TasksModule } from './resources/tasks/tasks.module';
```

to:

```ts
import { TaskPhaseModule } from './resources/task-phase/task-phase.module';
import { TasksModule } from './resources/tasks/tasks.module';
import { TaskCommentsModule } from './resources/task-comments/task-comments.module';
```

and change:

```ts
        TaskPhaseModule,
        TasksModule,
```

to:

```ts
        TaskPhaseModule,
        TasksModule,
        TaskCommentsModule,
```

(If the file has drifted from this — e.g. other modules were added
or removed since this plan was written — apply the same two
insertions relative to whatever the current `task-*` imports/entries
are; the exact insertion point doesn't matter, only that both the
import and the `imports: []` entry get added.)

- [ ] **Step 3: Verify the whole backend still compiles and tests pass**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -40`
Expected: same pass count as before this plan started, plus the new
`task-comments` tests, plus the one pre-existing unrelated failure in
`test/unit/resources/google-calendar/google-calendar.service.spec.ts`
(confirmed pre-existing in an earlier session via `git stash` — not
something this plan introduces or needs to fix).

- [ ] **Step 4: Commit**

```bash
git add src/resources/task-comments/task-comments.module.ts src/app.module.ts
git commit -m "feat(task-comments): wire module into AppModule"
```

---

### Task 5: `ITaskComment` interface + `TaskCommentsComponent`

**Files:**
- Modify: `packages/web/src/app/interfaces/tasks.ts`
- Create: `packages/web/src/app/tslen-components/task-comments/task-comments.component.ts`
- Create: `packages/web/src/app/tslen-components/task-comments/task-comments.component.html`
- Create: `packages/web/src/app/tslen-components/task-comments/task-comments.component.scss`
- Test: `packages/web/src/app/tslen-components/task-comments/task-comments.component.spec.ts`

**Interfaces:**
- Consumes: `DataService.getObservableData(path): Observable<any>` and `DataService.postData(path, data)` (`packages/web/src/app/services/data.service.ts`).
- Produces: `<app-task-comments [taskId]="...">`, consumed by Task 6.

- [ ] **Step 1: Add the interface**

Append to `packages/web/src/app/interfaces/tasks.ts`:

```ts
export interface ITaskComment {
    id: number;
    taskId: number;
    content: string;
    createdAt: string;
    user: {
        id: number;
        firstName: string;
        lastName: string;
    };
}
```

- [ ] **Step 2: Write the failing component test**

```ts
// packages/web/src/app/tslen-components/task-comments/task-comments.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TaskCommentsComponent } from './task-comments.component';
import { DataService } from '../../services/data.service';
import { ITaskComment } from '../../interfaces/tasks';

describe('TaskCommentsComponent', () => {
  let component: TaskCommentsComponent;
  let fixture: ComponentFixture<TaskCommentsComponent>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;

  const existingComment: ITaskComment = {
    id: 1,
    taskId: 5,
    content: 'first comment',
    createdAt: '2026-08-17T10:00:00.000Z',
    user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
  };

  beforeEach(async () => {
    dataServiceSpy = jasmine.createSpyObj('DataService', ['getObservableData', 'postData']);
    dataServiceSpy.getObservableData.and.returnValue(of([existingComment]));

    await TestBed.configureTestingModule({
      imports: [TaskCommentsComponent],
      providers: [{ provide: DataService, useValue: dataServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCommentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('taskId', 5);
  });

  it('loads existing comments for the task on init', () => {
    fixture.detectChanges();

    expect(dataServiceSpy.getObservableData).toHaveBeenCalledWith('/task-comments?taskId=5');
    expect(component.comments).toEqual([existingComment]);
  });

  it('posts a new comment and appends the server response to the list', () => {
    const created: ITaskComment = {
      id: 2,
      taskId: 5,
      content: 'new comment',
      createdAt: '2026-08-17T10:05:00.000Z',
      user: { id: 9, firstName: 'Jane', lastName: 'Doe' },
    };
    dataServiceSpy.postData.and.returnValue(of({ body: created }) as never);
    fixture.detectChanges();

    component.newCommentContent = 'new comment';
    component.postComment();

    expect(dataServiceSpy.postData).toHaveBeenCalledWith('/task-comments', { taskId: 5, content: 'new comment' });
    expect(component.comments).toEqual([existingComment, created]);
    expect(component.newCommentContent).toBe('');
  });

  it('does not post when content is empty or whitespace-only', () => {
    fixture.detectChanges();

    component.newCommentContent = '   ';
    component.postComment();

    expect(dataServiceSpy.postData).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd packages/web
export CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
cat > karma.conf.ci.js << 'EOF'
const base = require('./karma.conf.js');
module.exports = function (config) {
  base(config);
  config.set({
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-gpu'] }
    },
    singleRun: true,
    autoWatch: false,
    restartOnFileChange: false
  });
};
EOF
cat > tsconfig.spec.taskcomments.json << 'EOF'
{
  "extends": "./tsconfig.spec.json",
  "include": [
    "src/app/tslen-components/task-comments/**/*.spec.ts",
    "src/**/*.d.ts"
  ]
}
EOF
npx ng test --karma-config=karma.conf.ci.js --ts-config=tsconfig.spec.taskcomments.json --include='src/app/tslen-components/task-comments/**/*.spec.ts'
```
Expected: FAIL to even load — `task-comments.component` doesn't exist
yet. (This scoped-tsconfig setup is needed because the full `ng test`
run type-checks every spec in the repo, including pre-existing broken
unrelated ones — see AGENTS.md's Testing section.)

- [ ] **Step 4: Write the component**

```ts
// packages/web/src/app/tslen-components/task-comments/task-comments.component.ts
import { Component, OnInit, input, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ITaskComment } from '../../interfaces/tasks';

@Component({
  selector: 'app-task-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './task-comments.component.html',
  styleUrls: ['./task-comments.component.scss'],
})
export class TaskCommentsComponent implements OnInit {
  taskId = input.required<number>();
  comments: ITaskComment[] = [];
  newCommentContent = '';

  private dataService = inject(DataService);

  ngOnInit (): void {
    this.dataService.getObservableData(`/task-comments?taskId=${this.taskId()}`)
      .subscribe((comments: ITaskComment[]) => {
        this.comments = comments;
      });
  }

  postComment (): void {
    const content = this.newCommentContent.trim();
    if (!content) {
      return;
    }
    this.dataService.postData('/task-comments', { taskId: this.taskId(), content })
      .subscribe((response: any) => {
        this.comments = [...this.comments, response.body as ITaskComment];
        this.newCommentContent = '';
      });
  }
}
```

```html
<!-- packages/web/src/app/tslen-components/task-comments/task-comments.component.html -->
<div class="task-comments">
  <h4>Comments</h4>
  <ul class="task-comments-list">
    <li *ngFor="let comment of comments">
      <strong>{{ comment.user.firstName }} {{ comment.user.lastName }}</strong>
      <span class="task-comments-timestamp">{{ comment.createdAt | date:'short' }}</span>
      <p>{{ comment.content }}</p>
    </li>
  </ul>
  <div class="task-comments-form">
    <textarea
      [(ngModel)]="newCommentContent"
      placeholder="Write a comment..."
      rows="2"
    ></textarea>
    <button
      type="button"
      (click)="postComment()"
      [disabled]="!newCommentContent.trim()"
    >Post</button>
  </div>
</div>
```

```scss
// packages/web/src/app/tslen-components/task-comments/task-comments.component.scss
.task-comments {
  margin-top: 16px;
}
.task-comments-list {
  list-style: none;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
}
.task-comments-timestamp {
  margin-left: 8px;
  font-size: 0.8em;
  opacity: 0.6;
}
.task-comments-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run the same `npx ng test ...` command from Step 3.
Expected: 3 SUCCESS (load on init, post + append, empty-content
no-op).

- [ ] **Step 6: Clean up the temporary test harness files**

```bash
rm -f packages/web/karma.conf.ci.js packages/web/tsconfig.spec.taskcomments.json
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/app/interfaces/tasks.ts packages/web/src/app/tslen-components/task-comments/
git commit -m "feat(task-comments): add TaskCommentsComponent"
```

---

### Task 6: Mount `TaskCommentsComponent` in the task edit dialog

**Files:**
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.ts`
- Modify: `packages/web/src/app/tslen-components/task-create-edit/task-create-edit.component.html`

**Interfaces:**
- Consumes: `TaskCommentsComponent` (Task 5), `this.taskId` (existing property on `TaskCreateEditComponent`, set in `ngOnInit` from `this.form.value.id`).

- [ ] **Step 1: Add the import**

In `task-create-edit.component.ts`, add:

```ts
import { TaskCommentsComponent } from '../task-comments/task-comments.component';
```

and add `TaskCommentsComponent` to the component's `imports: [...]`
array (next to `UploadFilesComponent`).

- [ ] **Step 2: Add the template section**

In `task-create-edit.component.html`, find this exact block (the
attachments list, currently the last thing inside the scrollable
form area before `mat-dialog-content` closes):

```html
                @if(attachments && attachments?.length > 0) {
                    <div>
                        <mat-selection-list [multiple]="false">
                            <mat-list-option *ngFor="let files of attachments" [value]="[files.url, files.originName]">
                                        <span class="d-flex">
                                            <span (click)="openPreview(files.url)" class="mr-auto p-2">{{files.originName}}</span>
                                            <span (click)="deleteAttachment(files.id)" class="p-2 custom-icon-delete"><mat-icon>delete_forever</mat-icon></span>
                                        </span>
                            </mat-list-option>
                        </mat-selection-list>
                    </div>
                }
```

and insert the new block immediately after it (still inside the same
parent `<div>`, before that `<div>` closes):

```html
                @if (taskId) {
                    <div>
                        <app-task-comments [taskId]="taskId"></app-task-comments>
                    </div>
                }
```

- [ ] **Step 3: Verify the frontend still builds**

```bash
cd packages/web
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0
npx ng build 2>&1 | tail -40
```
(No `--configuration` flag — this project's `angular.json` only
defines a `production` configuration; the default/base build options
already have `aot: false` for a faster check.)
Expected: build succeeds with no new TypeScript errors. (Pre-existing
unrelated build warnings, if any, are not this task's concern.)

There is no new test for this step — `task-create-edit.component.spec.ts`
was already broken before this plan (missing `MAT_DIALOG_DATA`/
`DataService`/`AuthenticationService` providers), same as
`live-chat.component.spec.ts` was when `ChatComponent` was wired into
it earlier; confirm with
`git stash && cd packages/web && npx ng test ... task-create-edit.component.spec.ts ...; cd ../.. && git stash pop`
if you want to double check before/after, but do not attempt to fix
that pre-existing breakage as part of this task.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/tslen-components/task-create-edit/
git commit -m "feat(task-comments): show comment thread in the task edit dialog"
```

---

### Task 7: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend suite**

Run: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && nvm use v22.2.0 && npx jest --config ./test/jest.json --testPathIgnorePatterns=e2e 2>&1 | tail -60`
Expected: all tests pass except the one pre-existing, unrelated
failure in `google-calendar.service.spec.ts` (see Task 4, Step 3).

- [ ] **Step 2: Run the new frontend specs once more with the temporary harness**

Repeat Task 5 Step 3's setup and run command, confirm 3/3 SUCCESS,
then clean up the temporary files again (Task 5 Step 6) if you
recreated them.

- [ ] **Step 3: Confirm working tree is clean**

Run: `git status --short`
Expected: no output (everything already committed task-by-task).
