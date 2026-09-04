/**
 * Seeds a fresh, isolated demo company ("Acme Robotics") with realistic
 * data across every table the core UI reads from - dashboard, tasks
 * (kanban board + comments), personal/common schedule calendars, and
 * manage users/profile - for recording README GIFs and a landing-page
 * demo video.
 *
 * Fully additive: creates a brand new company/users/projects, never
 * touches existing data (e.g. companyId=1). Uses the app's real
 * services/repositories (not raw SQL) so business logic - password
 * hashing, the per-user daysOff balance derived from
 * CompanyDaysOffRules, etc. - runs exactly as it does through the API.
 *
 * Usage (from repo root):
 *   nvm use 24.19.0
 *   npx ts-node -r tsconfig-paths/register scripts/seed-demo-data.ts
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CompanyService } from '../src/resources/company/company.service';
import { JobPositionService } from '../src/resources/job-position/job-position.service';
import { UserGroupService } from '../src/resources/user-group/user-group.service';
import { UsersService } from '../src/resources/users/users.service';
import { TaskProjectService } from '../src/resources/task-project/task-project.service';
import { TasksService } from '../src/resources/tasks/tasks.service';
import { TaskCommentsService } from '../src/resources/task-comments/task-comments.service';
import { EventsByUserService } from '../src/resources/events-by-user/events-by-user.service';
import { PostsService } from '../src/resources/posts/posts.service';
import { Users } from '../src/resources/users/entities/users.entity';

const COMPANY_NAME = 'Acme Robotics';
const DEMO_PASSWORD = 'DemoWorkhub2026!';
const AVATAR = '/assets/images/profile/default.png';

const PHASE_NAMES = ['To Do', 'In Progress', 'Review', 'Done'];

function daysFromNow (n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay (d: Date): Date {
    const e = new Date(d);
    e.setHours(23, 59, 0, 0);
    return e;
}
// Deadline per phase, so the task-detail "estimate" badge shows a real
// near-term/past date instead of a null - a null estimate renders as a
// ~20700-day countdown (the UI diffs against epoch 1970 for a missing
// date), which is the bug this staggering avoids.
function estimateForPhase (phase: string): Date {
    switch (phase) {
        case 'To Do': return daysFromNow(7 + Math.floor(Math.random() * 14));
        case 'In Progress': return daysFromNow(2 + Math.floor(Math.random() * 8));
        case 'Review': return daysFromNow(1 + Math.floor(Math.random() * 4));
        case 'Done': return daysFromNow(-(2 + Math.floor(Math.random() * 10)));
        default: return daysFromNow(7);
    }
}

async function main () {
    const app = await NestFactory.createApplicationContext(AppModule);
    const companyService = app.get(CompanyService);
    const jobPositionService = app.get(JobPositionService);
    const userGroupService = app.get(UserGroupService);
    const usersService = app.get(UsersService);
    const taskProjectService = app.get(TaskProjectService);
    const tasksService = app.get(TasksService);
    const taskCommentsService = app.get(TaskCommentsService);
    const eventsByUserService = app.get(EventsByUserService);
    const postsService = app.get(PostsService);

    console.log(`Creating company "${COMPANY_NAME}"...`);
    const company: any = await companyService.create({
        name: COMPANY_NAME,
        country: 'USA',
        companyDaysOffRules: [{
            hospital: 10, timeOff: 10, vocation: 20, transfer: 10, home: 10,
            useScheduler: 0, resetYearly: 0,
        }],
        daysOffSchedulers: [
            { requestType: 'timeOff', timeCoefficient: 0, repeatBy: 'month' },
            { requestType: 'vocation', timeCoefficient: 0, repeatBy: 'month' },
            { requestType: 'transfer', timeCoefficient: 0, repeatBy: 'month' },
            { requestType: 'home', timeCoefficient: 0, repeatBy: 'month' },
            { requestType: 'hospital', timeCoefficient: 0, repeatBy: 'month' },
        ],
    } as any);
    const companyId = company.id;
    console.log(`  companyId=${companyId}`);

    console.log('Creating job positions...');
    const jobTitles = ['Product Manager', 'Backend Engineer', 'Frontend Engineer', 'QA Engineer', 'UI/UX Designer', 'HR Manager'];
    const jobPositionIdByTitle: Record<string, number> = {};
    for (const title of jobTitles) {
        const jp: any = await jobPositionService.create({ title } as any);
        jobPositionIdByTitle[title] = jp.id;
    }

    console.log('Creating user groups...');
    const groupNames = ['Engineering', 'Design', 'Product', 'HR'];
    const groupIdByName: Record<string, number> = {};
    for (const name of groupNames) {
        const g: any = await userGroupService.create({ name, permissions: 'user', companyId } as any);
        groupIdByName[name] = g.id;
    }

    console.log('Creating users...');
    type SeedUser = {
        key: string; firstName: string; lastName: string; email: string;
        role: 'admin' | 'manager' | 'user'; jobTitle: string; group: string;
        chiefKey?: string; probation?: boolean; birthDay?: Date; tenureDays?: number;
    };
    // Managers first so their reports can reference them as chief. tenureDays
    // is deliberately staggered (not a single shared offset) - the dashboard's
    // "upcoming anniversary" widget looks fake/broken when every employee's
    // firstDayInCompany falls on the exact same day.
    const seedUsers: SeedUser[] = [
        { key: 'sarah', firstName: 'Sarah', lastName: 'Chen', email: 'demo.admin@t-slen.local', role: 'admin', jobTitle: 'Product Manager', group: 'Product', birthDay: new Date('1988-03-14'), tenureDays: -1920 },
        { key: 'james', firstName: 'James', lastName: 'Okafor', email: 'james.okafor@t-slen.local', role: 'manager', jobTitle: 'Backend Engineer', group: 'Engineering', chiefKey: 'sarah', birthDay: new Date('1985-07-02'), tenureDays: -1280 },
        { key: 'noah', firstName: 'Noah', lastName: 'Fischer', email: 'noah.fischer@t-slen.local', role: 'manager', jobTitle: 'HR Manager', group: 'HR', chiefKey: 'sarah', birthDay: new Date('1990-11-21'), tenureDays: -1000 },
        { key: 'maria', firstName: 'Maria', lastName: 'Lopez', email: 'maria.lopez@t-slen.local', role: 'user', jobTitle: 'Backend Engineer', group: 'Engineering', chiefKey: 'james', birthDay: new Date('1994-05-09'), tenureDays: -740 },
        { key: 'tom', firstName: 'Tom', lastName: 'Becker', email: 'tom.becker@t-slen.local', role: 'user', jobTitle: 'Backend Engineer', group: 'Engineering', chiefKey: 'james', birthDay: new Date('1992-01-30'), tenureDays: -580 },
        { key: 'aiko', firstName: 'Aiko', lastName: 'Tanaka', email: 'aiko.tanaka@t-slen.local', role: 'user', jobTitle: 'Frontend Engineer', group: 'Engineering', chiefKey: 'james', birthDay: new Date('1996-09-17'), tenureDays: -360 },
        { key: 'liam', firstName: 'Liam', lastName: 'O’Brien', email: 'liam.obrien@t-slen.local', role: 'user', jobTitle: 'QA Engineer', group: 'Engineering', chiefKey: 'james', birthDay: new Date('1993-12-05'), tenureDays: -220 },
        { key: 'priya', firstName: 'Priya', lastName: 'Nair', email: 'priya.nair@t-slen.local', role: 'user', jobTitle: 'UI/UX Designer', group: 'Design', chiefKey: 'sarah', birthDay: new Date('1995-02-18'), tenureDays: -60 },
        { key: 'emma', firstName: 'Emma', lastName: 'Rossi', email: 'emma.rossi@t-slen.local', role: 'user', jobTitle: 'Frontend Engineer', group: 'Engineering', chiefKey: 'james', probation: true, birthDay: new Date('1998-06-24') },
    ];

    const usersByKey: Record<string, any> = {};
    for (const u of seedUsers) {
        const dto: any = {
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            password: DEMO_PASSWORD,
            role: u.role,
            company: COMPANY_NAME,
            companyId,
            isActive: 1,
            avatar: AVATAR,
            jobPosition: String(jobPositionIdByTitle[u.jobTitle]),
            firstDayInCompany: u.probation ? daysFromNow(-10) : daysFromNow(u.tenureDays ?? -365),
            birthDay: u.birthDay ?? null,
            userRelationToGroups: [{ groupId: groupIdByName[u.group] }],
        };
        if (u.chiefKey) {
            dto.userChiefRelations = [{ chiefId: usersByKey[u.chiefKey].id }];
        }
        if (u.probation) {
            dto.userProbation = {
                start: daysFromNow(-10).toISOString(),
                end: daysFromNow(80).toISOString(),
                isProbation: true,
            };
        }
        const saved = await usersService.create(dto);
        usersByKey[u.key] = saved;
        console.log(`  ${u.firstName} ${u.lastName} <${u.email}> id=${saved.id}`);
    }

    console.log('Creating task projects + phases...');
    // sarah (the demo admin/login) is deliberately on every project's member
    // list - without it she only has taskProjectPermission on whichever
    // project happens to list her, and the Tasks Manager board only shows
    // projects the logged-in user has permission on, so the other two boards
    // would silently disappear for the account used to record the demo.
    type SeedProject = { key: string; name: string; description: string; memberKeys: string[] };
    const seedProjects: SeedProject[] = [
        { key: 'website', name: 'Website Relaunch', description: 'Marketing site redesign and CMS migration', memberKeys: ['sarah', 'priya', 'aiko', 'tom'] },
        { key: 'mobile', name: 'Mobile App v2', description: 'Next-gen iOS/Android client with offline support', memberKeys: ['sarah', 'james', 'maria', 'liam', 'aiko'] },
        { key: 'internal', name: 'Internal Tools', description: 'Admin dashboards and automation for internal teams', memberKeys: ['sarah', 'james', 'tom', 'noah', 'emma'] },
    ];
    const projectsByKey: Record<string, { id: number; phaseIdByName: Record<string, number> }> = {};
    for (const p of seedProjects) {
        const saved: any = await taskProjectService.create({
            name: p.name,
            description: p.description,
            companyId,
            isPrivate: 0,
            createdAt: new Date(),
            phases: PHASE_NAMES.map((name) => ({ name })),
            taskProjectPermissions: p.memberKeys.map((key) => ({ userId: usersByKey[key].id, permission: 'write' })),
        } as any);
        const phaseIdByName: Record<string, number> = {};
        for (const phase of saved.phases) {
            phaseIdByName[phase.name] = phase.id;
        }
        // TaskProjectSubscriber.afterInsert already creates a
        // ProjectPhasesRelation row per phase (see task-project/subscribers)
        // - inserting them again here duplicated every phase column in the
        // Kanban board (each phase, and its tasks, rendered twice).
        projectsByKey[p.key] = { id: saved.id, phaseIdByName };
        console.log(`  ${p.name} id=${saved.id}`);
    }

    console.log('Creating tasks...');
    type SeedTask = {
        projectKey: string; phase: string; title: string; description: string;
        priority: 'low' | 'medium' | 'high'; status: string; creatorKey: string; assigneeKeys: string[];
        comments?: { authorKey: string; content: string }[];
    };
    const seedTasks: SeedTask[] = [
        { projectKey: 'website', phase: 'To Do', title: 'Design new homepage hero section', description: 'Explore 3 hero layout options with the new brand palette.', priority: 'medium', status: 'unStatus', creatorKey: 'sarah', assigneeKeys: ['priya'] },
        { projectKey: 'website', phase: 'To Do', title: 'Audit existing CMS content model', description: 'Catalog every content type before the migration plan.', priority: 'low', status: 'unStatus', creatorKey: 'sarah', assigneeKeys: ['tom'] },
        { projectKey: 'website', phase: 'In Progress', title: 'Build responsive nav component', description: 'Sticky nav with mobile drawer, matching the new design system.', priority: 'high', status: 'inProgress', creatorKey: 'sarah', assigneeKeys: ['aiko'],
            comments: [
                { authorKey: 'aiko', content: 'Drawer animation is done, working on focus trapping now.' },
                { authorKey: 'sarah', content: 'Nice - can you also check it on iOS Safari?' },
            ] },
        { projectKey: 'website', phase: 'In Progress', title: 'Wire up CMS API client', description: 'Typed client for the new headless CMS endpoints.', priority: 'medium', status: 'inProgress', creatorKey: 'sarah', assigneeKeys: ['tom'] },
        { projectKey: 'website', phase: 'Review', title: 'Landing page copy pass', description: 'Final proofread of hero, pricing, and footer copy.', priority: 'low', status: 'test', creatorKey: 'sarah', assigneeKeys: ['priya', 'sarah'] },
        { projectKey: 'website', phase: 'Done', title: 'Set up staging environment', description: 'staging.acme-robotics.demo pointed at the new stack.', priority: 'medium', status: 'done', creatorKey: 'tom', assigneeKeys: ['tom'] },
        { projectKey: 'website', phase: 'Done', title: 'Migrate DNS + SSL cert', description: '', priority: 'high', status: 'release', creatorKey: 'tom', assigneeKeys: ['tom'] },

        { projectKey: 'mobile', phase: 'To Do', title: 'Spike: offline-first sync strategy', description: 'Compare CRDT vs. simple last-write-wins for local cache sync.', priority: 'high', status: 'unStatus', creatorKey: 'james', assigneeKeys: ['maria'] },
        { projectKey: 'mobile', phase: 'To Do', title: 'Design push notification opt-in flow', description: '', priority: 'low', status: 'unStatus', creatorKey: 'james', assigneeKeys: ['aiko'] },
        { projectKey: 'mobile', phase: 'In Progress', title: 'Implement biometric login', description: 'FaceID/TouchID on iOS, BiometricPrompt on Android.', priority: 'high', status: 'inProgress', creatorKey: 'james', assigneeKeys: ['liam'],
            comments: [
                { authorKey: 'liam', content: 'Android side works, iOS FaceID prompt copy needs legal sign-off.' },
            ] },
        { projectKey: 'mobile', phase: 'In Progress', title: 'Offline queue for pending actions', description: 'Retry queue with exponential backoff once connectivity returns.', priority: 'medium', status: 'inProgress', creatorKey: 'james', assigneeKeys: ['maria'] },
        { projectKey: 'mobile', phase: 'Review', title: 'Accessibility pass on onboarding', description: 'VoiceOver/TalkBack labels for every onboarding screen.', priority: 'medium', status: 'test', creatorKey: 'james', assigneeKeys: ['aiko'] },
        { projectKey: 'mobile', phase: 'Done', title: 'Upgrade to React Native 0.75', description: '', priority: 'low', status: 'done', creatorKey: 'maria', assigneeKeys: ['maria'] },

        { projectKey: 'internal', phase: 'To Do', title: 'Automate weekly headcount report', description: 'Pull active/probation counts into a scheduled Slack digest.', priority: 'low', status: 'unStatus', creatorKey: 'noah', assigneeKeys: ['emma'] },
        { projectKey: 'internal', phase: 'To Do', title: 'Add bulk CSV import for inventory', description: '', priority: 'medium', status: 'unStatus', creatorKey: 'james', assigneeKeys: ['tom'] },
        { projectKey: 'internal', phase: 'In Progress', title: 'Rebuild audit log filters', description: 'Filter by actor, entity type, and date range.', priority: 'medium', status: 'inProgress', creatorKey: 'james', assigneeKeys: ['tom'],
            comments: [
                { authorKey: 'tom', content: 'Date range filter is in, entity type dropdown next.' },
                { authorKey: 'james', content: 'Can we default to the last 7 days?' },
                { authorKey: 'tom', content: 'Yep, done in the latest commit.' },
            ] },
        { projectKey: 'internal', phase: 'Review', title: 'Onboard Emma’s laptop + accounts', description: 'Standard new-hire provisioning checklist.', priority: 'high', status: 'test', creatorKey: 'noah', assigneeKeys: ['noah', 'emma'],
            comments: [
                { authorKey: 'noah', content: 'Accounts are provisioned, just waiting on the laptop shipment.' },
            ] },
        { projectKey: 'internal', phase: 'Done', title: 'Set up company holiday calendar', description: '', priority: 'low', status: 'done', creatorKey: 'noah', assigneeKeys: ['noah'] },
        { projectKey: 'internal', phase: 'Done', title: 'Retire legacy timesheet spreadsheet', description: '', priority: 'low', status: 'done', creatorKey: 'james', assigneeKeys: ['james'] },
    ];

    let taskCount = 0;
    let commentCount = 0;
    for (const t of seedTasks) {
        const project = projectsByKey[t.projectKey];
        const creator = usersByKey[t.creatorKey];
        const savedTask: any = await tasksService.create({
            title: t.title,
            description: t.description,
            projectId: project.id,
            phaseId: project.phaseIdByName[t.phase],
            priority: t.priority,
            status: t.status,
            createdBy: creator.email,
            createdByName: `${creator.firstName} ${creator.lastName}`,
            createdAt: new Date(),
            // A null estimate/updatedAt renders as a ~20700-day countdown/
            // "updated X days ago" badge (the UI diffs against epoch 1970
            // for a missing date) - set both explicitly.
            estimate: estimateForPhase(t.phase),
            updatedAt: new Date(),
            taskUserAssignmentRelations: t.assigneeKeys.map((key) => ({ userId: usersByKey[key].id })),
        } as any);
        taskCount++;
        for (const c of t.comments ?? []) {
            const author = usersByKey[c.authorKey];
            await taskCommentsService.create({
                taskId: savedTask.id, userId: author.id, content: c.content,
            } as any);
            commentCount++;
        }
    }
    console.log(`  ${taskCount} tasks, ${commentCount} comments`);

    console.log('Creating calendar events...');
    // Sarah has no chief, so her pending request skips the chief-notification
    // email branch entirely (safe with no SMTP configured locally).
    await eventsByUserService.create({
        title: 'vocation', start: daysFromNow(20) as any, end: endOfDay(daysFromNow(22)) as any,
        primaryColor: '#4caf50', secondaryColor: '#d4dadc', isRequest: true, approved: 0,
        requestType: 'vocation', isGoogleEvent: false, createdAt: new Date(),
    } as any, usersByKey.sarah as Users);

    await eventsByUserService.create({
        title: 'vocation', start: daysFromNow(5) as any, end: endOfDay(daysFromNow(9)) as any,
        primaryColor: '#4caf50', secondaryColor: '#4caf50', isRequest: true, approved: 1,
        requestType: 'vocation', isGoogleEvent: false, createdAt: new Date(),
    } as any, usersByKey.maria as Users);

    await eventsByUserService.create({
        title: 'hospital', start: daysFromNow(2) as any, end: endOfDay(daysFromNow(2)) as any,
        primaryColor: '#f44336', secondaryColor: '#f44336', isRequest: true, approved: 1,
        requestType: 'hospital', isGoogleEvent: false, createdAt: new Date(),
    } as any, usersByKey.tom as Users);

    await eventsByUserService.create({
        title: 'home', start: daysFromNow(1) as any, end: endOfDay(daysFromNow(1)) as any,
        primaryColor: '#9c27b0', secondaryColor: '#9c27b0', isRequest: true, approved: 1,
        requestType: 'home', isGoogleEvent: false, createdAt: new Date(),
    } as any, usersByKey.james as Users);

    await eventsByUserService.create({
        title: 'Sprint planning', start: daysFromNow(3) as any, end: daysFromNow(3) as any,
        primaryColor: '#4680ff', secondaryColor: '#4680ff', isRequest: false, approved: 0,
        isGoogleEvent: false, createdAt: new Date(),
        attendees: [{ userEmail: usersByKey.maria.email }, { userEmail: usersByKey.tom.email }, { userEmail: usersByKey.aiko.email }],
    } as any, usersByKey.james as Users);

    await eventsByUserService.create({
        title: 'Design review', start: daysFromNow(6) as any, end: daysFromNow(6) as any,
        primaryColor: '#4680ff', secondaryColor: '#4680ff', isRequest: false, approved: 0,
        isGoogleEvent: false, createdAt: new Date(),
        attendees: [{ userEmail: usersByKey.sarah.email }, { userEmail: usersByKey.aiko.email }],
    } as any, usersByKey.priya as Users);

    console.log('Creating posts...');
    // Posts' "title" field is the author's display name (not a headline) and
    // "subtitle" is the post date - the template renders title as the
    // card's name line and pipes subtitle through Angular's `date` pipe.
    type SeedPost = { authorKey: string; daysAgo: number; text: string; likedByKeys: string[] };
    const seedPosts: SeedPost[] = [
        { authorKey: 'sarah', daysAgo: 2, text: "Excited to have our whole team on the new internal tools setup. Ping me if anything looks off - we're still tuning it.", likedByKeys: ['james', 'maria', 'aiko'] },
        { authorKey: 'james', daysAgo: 1, text: 'Kicked off the v2 rebuild this week - offline-first sync and biometric login are the two big bets. Details in the Mobile App v2 board.', likedByKeys: ['sarah', 'liam'] },
        { authorKey: 'sarah', daysAgo: 0, text: 'Reminder: open Q&A with leadership every Friday at 4pm. Bring questions about roadmap, process, anything.', likedByKeys: ['noah'] },
    ];
    for (const p of seedPosts) {
        const author = usersByKey[p.authorKey];
        await postsService.create({
            userId: author.id,
            companyId,
            title: `${author.firstName} ${author.lastName}`,
            subtitle: daysFromNow(-p.daysAgo).toISOString() as any,
            text: p.text,
            likes: p.likedByKeys.length,
            likesOwners: p.likedByKeys.map((key) => usersByKey[key].id).join('|'),
            avatar: AVATAR,
        } as any);
    }

    console.log('\nDone.');
    console.log(`Company: ${COMPANY_NAME} (companyId=${companyId})`);
    console.log(`Demo login -> email: ${usersByKey.sarah.email}  password: ${DEMO_PASSWORD}`);

    await app.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
