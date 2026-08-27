import { MeetingLinksRepository } from '../../../../src/resources/meeting-links/meeting-links.repository';
import { MeetingLink } from '../../../../src/resources/meeting-links/entities/meeting-link.entity';

describe('MeetingLinksRepository', () => {
    let repository: MeetingLinksRepository;
    let typeOrmRepository: { find: jest.Mock; findOne: jest.Mock };

    beforeEach(() => {
        typeOrmRepository = { find: jest.fn(), findOne: jest.fn() };
        repository = new MeetingLinksRepository(typeOrmRepository as any);
    });

    it('findAllForHost filters by hostUserId, newest first', async () => {
        const rows = [{ id: 1 } as MeetingLink];
        typeOrmRepository.find.mockResolvedValue(rows);

        const result = await repository.findAllForHost(7);

        expect(typeOrmRepository.find).toHaveBeenCalledWith({
            where: { hostUserId: 7 },
            order: { createdAt: 'DESC' },
        });
        expect(result).toBe(rows);
    });

    it('findByTokenHash looks up by the hashed token column', async () => {
        const row = { id: 1, token: 'hashed-value' } as MeetingLink;
        typeOrmRepository.findOne.mockResolvedValue(row);

        const result = await repository.findByTokenHash('hashed-value');

        expect(typeOrmRepository.findOne).toHaveBeenCalledWith({ where: { token: 'hashed-value' } });
        expect(result).toBe(row);
    });
});
