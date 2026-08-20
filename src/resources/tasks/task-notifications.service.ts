import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../../common/services/mail/mail.service';
import { LiveKitGateway } from '../live-kit/gateway/live-kit.gateway';
import { Tasks } from './entities/task.entity';
import { Users } from '../users/entities/users.entity';

interface NotifyRecipient {
    id: number;
    email: string;
    firstName: string;
}

@Injectable()
export class TaskNotificationsService {
    private readonly logger = new Logger(TaskNotificationsService.name);

    constructor (
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
        private readonly liveKitGateway: LiveKitGateway,
        private readonly configService: ConfigService,
    ) {}

    private buildLink (task: Tasks): string {
        const frontDomain = this.configService.get('FRONT_DOMAIN');
        return `${frontDomain}/pages/tasks-list/${task.projectId}`;
    }

    private async deliver (
        recipient: NotifyRecipient,
        title: string,
        message: string,
        link: string,
        template: string,
        context: Record<string, unknown>,
    ): Promise<void> {
        try {
            const notification = await this.notificationsService.createForUser(recipient.id, title, message, link);
            this.liveKitGateway.notifyUser(recipient.id, notification);
        } catch (e) {
            this.logger.error(`Failed to create/push in-app notification for user ${recipient.id}: ${e.message}`);
        }
        try {
            await this.mailService.sendMail({
                to: recipient.email,
                subject: title,
                template: `./${template}`,
                context: { ...context, recipient, link },
            });
        } catch (e) {
            this.logger.error(`Failed to email user ${recipient.id}: ${e.message}`);
        }
    }

    async notifyAssigned (task: Tasks, newAssignees: Users[], actor: Users | null): Promise<void> {
        const link = this.buildLink(task);
        const recipients = newAssignees.filter(u => !actor || u.id !== actor.id);
        for (const user of recipients) {
            await this.deliver(
                { id: user.id, email: user.email, firstName: user.firstName },
                'You were assigned a task',
                `${actor ? actor.firstName + ' ' + actor.lastName : 'Someone'} assigned you to "${task.title}"`,
                link,
                'task.assigned.hbs',
                { task, actor },
            );
        }
    }

    async notifyCommented (task: Tasks, commentContent: string, commenter: Users, recipients: Users[]): Promise<void> {
        const link = this.buildLink(task);
        const filtered = recipients.filter(u => u.id !== commenter.id);
        for (const user of filtered) {
            await this.deliver(
                { id: user.id, email: user.email, firstName: user.firstName },
                'New comment on your task',
                `${commenter.firstName} ${commenter.lastName} commented on "${task.title}"`,
                link,
                'task.commented.hbs',
                { task, commenter, commentContent },
            );
        }
    }

    async notifyPhaseMoved (task: Tasks, fromPhaseName: string, toPhaseName: string, recipients: Users[], actor: Users | null): Promise<void> {
        const link = this.buildLink(task);
        const filtered = recipients.filter(u => !actor || u.id !== actor.id);
        for (const user of filtered) {
            await this.deliver(
                { id: user.id, email: user.email, firstName: user.firstName },
                'Task moved to a new phase',
                `"${task.title}" moved from ${fromPhaseName} to ${toPhaseName}`,
                link,
                'task.phase-moved.hbs',
                { task, actor, fromPhaseName, toPhaseName },
            );
        }
    }
}
