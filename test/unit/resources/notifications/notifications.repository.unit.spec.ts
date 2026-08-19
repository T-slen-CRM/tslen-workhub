import { TestBed } from '@automock/jest';
import { NotificationsRepository } from '../../../../src/resources/notifications/notifications.repository';

describe('NotificationsRepository', () => {
    let repository: NotificationsRepository;
    beforeEach(() => {
        const { unit } = TestBed.create(NotificationsRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
});
