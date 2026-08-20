import { TestBed } from '@automock/jest';
import { ConfigService } from '@nestjs/config';
import { TaskNotificationsService } from '../../../../src/resources/tasks/task-notifications.service';
import { NotificationsService } from '../../../../src/resources/notifications/notifications.service';
import { MailService } from '../../../../src/common/services/mail/mail.service';
import { LiveKitGateway } from '../../../../src/resources/live-kit/gateway/live-kit.gateway';
import { Tasks } from '../../../../src/resources/tasks/entities/task.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { Notification } from '../../../../src/resources/notifications/entities/notification.entity';

describe('TaskNotificationsService', () => {
    let service: TaskNotificationsService;
    let notificationsService: jest.Mocked<NotificationsService>;
    let mailService: jest.Mocked<MailService>;
    let liveKitGateway: jest.Mocked<LiveKitGateway>;
    let configService: jest.Mocked<ConfigService>;

    const task = { id: 1, title: 'Ship it', projectId: 3 } as Tasks;
    const actor = { id: 1, firstName: 'Ann', lastName: 'Actor', email: 'ann@example.com' } as Users;
    const assignee = { id: 2, firstName: 'Bob', lastName: 'Assignee', email: 'bob@example.com' } as Users;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(TaskNotificationsService).compile();
        service = unit;
        notificationsService = unitRef.get(NotificationsService);
        mailService = unitRef.get(MailService);
        liveKitGateway = unitRef.get(LiveKitGateway);
        configService = unitRef.get(ConfigService);
        configService.get.mockReturnValue('https://crm.t-slen.com');
        notificationsService.createForUser.mockResolvedValue({ id: 99 } as Notification);
    });

    describe('notifyAssigned', () => {
        it('delivers an in-app notification and email to each new assignee', async () => {
            await service.notifyAssigned(task, [assignee], actor);

            expect(notificationsService.createForUser).toHaveBeenCalledWith(
                2, 'You were assigned a task', 'Ann Actor assigned you to "Ship it"', 'https://crm.t-slen.com/pages/tasks-list/3',
            );
            expect(liveKitGateway.notifyUser).toHaveBeenCalledWith(2, { id: 99 });
            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'bob@example.com',
                template: './task.assigned.hbs',
            }));
        });

        it('excludes the actor from their own assignment notification', async () => {
            await service.notifyAssigned(task, [actor], actor);

            expect(notificationsService.createForUser).not.toHaveBeenCalled();
            expect(mailService.sendMail).not.toHaveBeenCalled();
        });

        it('still emails the in-app-eligible recipients when one delivery throws', async () => {
            const secondAssignee = { id: 5, firstName: 'Cara', lastName: 'C', email: 'cara@example.com' } as Users;
            notificationsService.createForUser
                .mockRejectedValueOnce(new Error('db down'))
                .mockResolvedValueOnce({ id: 100 } as Notification);

            await service.notifyAssigned(task, [assignee, secondAssignee], actor);

            expect(mailService.sendMail).toHaveBeenCalledTimes(2);
            expect(liveKitGateway.notifyUser).toHaveBeenCalledWith(5, { id: 100 });
        });
    });

    describe('notifyCommented', () => {
        it('excludes the commenter from the recipient list', async () => {
            await service.notifyCommented(task, 'nice work', actor, [actor, assignee]);

            expect(notificationsService.createForUser).toHaveBeenCalledTimes(1);
            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'bob@example.com',
                template: './task.commented.hbs',
            }));
        });
    });

    describe('notifyPhaseMoved', () => {
        it('excludes the actor and notifies the remaining recipients', async () => {
            await service.notifyPhaseMoved(task, 'To Do', 'In Progress', [actor, assignee], actor);

            expect(notificationsService.createForUser).toHaveBeenCalledTimes(1);
            expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'bob@example.com',
                template: './task.phase-moved.hbs',
                context: expect.objectContaining({ fromPhaseName: 'To Do', toPhaseName: 'In Progress' }),
            }));
        });
    });
});
