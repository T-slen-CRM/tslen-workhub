import { TestBed } from '@automock/jest';
import { EntityManager, FindOperator, Repository } from 'typeorm';
import { GoogleCalendarRepository } from '../../../../src/resources/google-calendar/google-calendar.repository';
import { GoogleCalendar } from '../../../../src/resources/google-calendar/entities/google-calendar.entity';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockedEventByUser } from '../../../shared/event-by-user';
import { EventsByUser } from '../../../../src/resources/events-by-user/entities/events-by-user.entity';

/**
 * Minimal in-memory stand-in for TypeORM's EntityManager, applying the
 * same `where` clauses the repository sends it (equality, In, MoreThanOrEqual)
 * against a fixed set of "rows" so tests exercise real matching logic.
 */
class FakeEntityManager {
    public saved: EventsByUser[] = [];
    constructor (private readonly rows: EventsByUser[]) {}

    async transaction<T> (work: (manager: FakeEntityManager) => Promise<T>): Promise<T> {
        return work(this);
    }

    async find (_entity: unknown, options: { where: Record<string, unknown> }): Promise<EventsByUser[]> {
        const { where } = options;
        return this.rows.filter((row) => {
            return Object.entries(where).every(([key, condition]) => {
                const value = (row as unknown as Record<string, unknown>)[key];
                if (condition instanceof FindOperator) {
                    if (condition.type === 'moreThanOrEqual') {
                        return value >= (condition.value as Date);
                    }
                    if (condition.type === 'in') {
                        return (condition.value as unknown[]).includes(value);
                    }
                    throw new Error(`Unsupported FindOperator in test fake: ${condition.type}`);
                }
                return value === condition;
            });
        });
    }

    async save (entities: EventsByUser[]): Promise<EventsByUser[]> {
        this.saved.push(...entities);
        return entities;
    }
}

describe('GoogleCalendarRepository', () => {
    let repository: GoogleCalendarRepository;
    beforeEach(async () => {
        const { unit } = TestBed.create(GoogleCalendarRepository).compile();
        repository = unit;
    });
    it('should be defined', () => {
        expect(repository).toBeDefined();
    });
    it('should call authorize', async () => {
        const mockResponse: GoogleCalendar = {
            id: 1,
            calendarId: 'test@gmail.com',
            timezone: 'Europe/Madrid',
            userId: 1,
            user: {} as Users
        };
        const mockDto: GoogleCalendar = {
            calendarId: 'test@gmail.com',
            timezone: 'Europe/Madrid',
            userId: 1,
            id: null,
            user: {} as Users
        };
        const data = {
            googleCalendarEntity: mockDto,
            googleEvents: [mockedEventByUser]
        } as {googleCalendarEntity: GoogleCalendar, googleEvents: EventsByUser[]}
        jest.spyOn(repository, 'authorize').mockResolvedValue(mockResponse);
        const result = await repository.authorize(data);
        expect(result).toEqual(mockResponse);
    });

    describe('refreshGoogleCalendarEvents', () => {
        it('updates the existing row instead of inserting a duplicate when its stored end predates the recent-events window', async () => {
            const calendarId = 'cal-1';
            const staleEnd = new Date(Date.now() - 4 * 3600 * 1000); // outside "now - 3h"
            const existingRow = Object.assign(new EventsByUser({}), {
                id: 42,
                googleId: 'evt-1',
                googleCalendarId: calendarId,
                end: staleEnd,
            });
            const fakeEntityManager = new FakeEntityManager([existingRow]);
            const testRepository = new GoogleCalendarRepository(
                {} as Repository<GoogleCalendar>,
                fakeEntityManager as unknown as EntityManager,
            );

            const refreshedEvent = Object.assign(new EventsByUser({}), {
                googleId: 'evt-1',
                end: new Date(Date.now() + 2 * 3600 * 1000),
            });

            await testRepository.refreshGoogleCalendarEvents(calendarId, [refreshedEvent]);

            expect(fakeEntityManager.saved).toHaveLength(1);
            expect(fakeEntityManager.saved[0].id).toBe(42);
        });
    });
});
