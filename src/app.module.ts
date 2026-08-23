import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './common/database/database.module';
import { UsersModule } from './resources/users/users.module';
import { AuthModule } from './resources/auth/auth.module';
import { PostsModule } from './resources/posts/posts.module';
import { EventsByUserModule } from './resources/events-by-user/events-by-user.module';
import { JobPositionModule } from './resources/job-position/job-position.module';
import { UserGroupModule } from './resources/user-group/user-group.module';
import { TaskProjectModule } from './resources/task-project/task-project.module';
import { TaskPhaseModule } from './resources/task-phase/task-phase.module';
import { TasksModule } from './resources/tasks/tasks.module';
import { TaskCommentsModule } from './resources/task-comments/task-comments.module';
import { CompanyDaysOffRulesModule } from './resources/company-days-off-rules/company-days-off-rules.module';
import { CompanyModule } from './resources/company/company.module';
import { GoogleCalendarModule } from './resources/google-calendar/google-calendar.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronsModule } from './common/crons/crons.module';
import { MailModule } from './common/services/mail/mail.module';
import { LiveKitModule } from './resources/live-kit/live-kit.module';
import { ChatModule } from './resources/chat/chat.module';
import { InventoryModule } from './resources/inventory/inventory.module';
import { AppThrottlerModule } from './common/throttler/throttler.module';
import { ApiTokensModule } from './resources/api-tokens/api-tokens.module';
import { ExternalTasksModule } from './resources/external-tasks/external-tasks.module';
import { NotificationsModule } from './resources/notifications/notifications.module';
import { AuditLogModule } from './resources/audit-log/audit-log.module';
import { AuditLogMiddleware } from './common/middlewares/audit-log.middleware';
@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'packages', 'web', 'dist'),
            exclude: ['/api/(.*)'],
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        UsersModule,
        AuthModule,
        PostsModule,
        EventsByUserModule,
        JobPositionModule,
        UserGroupModule,
        TaskProjectModule,
        TaskPhaseModule,
        TasksModule,
        TaskCommentsModule,
        ApiTokensModule,
        ExternalTasksModule,
        NotificationsModule,
        CompanyDaysOffRulesModule,
        CompanyModule,
        GoogleCalendarModule,
        ScheduleModule.forRoot(),
        CronsModule,
        MailModule,
        LiveKitModule,
        ChatModule,
        InventoryModule,
        AppThrottlerModule,
        AuditLogModule
    ]
})
export class AppModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(AuditLogMiddleware).forRoutes('*');
    }
}
