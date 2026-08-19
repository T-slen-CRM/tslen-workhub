import { EventsByUser } from './entities/events-by-user.entity';
import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from '../users/entities/users.entity';
import { DeleteResult, EntityManager, Repository } from 'typeorm';
import { DatesRangeDto } from '../../common/dto/dates-range.dto';
import { DaysOffEntity } from '../company-days-off-rules/entities/days-off.entity';
import { CreateEventsByUserDto } from './dto/create-events-by-user.dto';
import { UserChiefRelationEntity } from '../users/entities/user-chief-relation.entity';
import { toSqlSafeInteger } from '../../common/utils/sql-safe-integer';

export class EventsByUserRepository extends BaseAbstractRepository<EventsByUser>{
    constructor (
    @InjectRepository(EventsByUser)
    private readonly eventsByUserRepository: Repository<EventsByUser>,
    private entityManager: EntityManager,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(DaysOffEntity)
    private readonly daysOffRepository: Repository<DaysOffEntity>
    ) {
        super(eventsByUserRepository);
    }
    async getEventsByMonth (user: Users, date: DatesRangeDto): Promise<EventsByUser[]> {
        const companyId: number = toSqlSafeInteger(user.companyId, 'companyId');
        const firstDay: string = date.startDate.toISOString();
        const lastDay: string = date.endDate.toISOString();

        // Query for events by user
        const q1 = this.eventsByUserRepository.createQueryBuilder('ebu')
            .select([
                `"u"."id" AS id`,
                `"u"."avatar" AS avatar`,
                `"u"."firstName" AS "firstName"`,
                `"u"."lastName" AS "lastName"`,
                `"ebu"."requestType"::TEXT AS "requestType"`, // Cast to TEXT
                `"ebu"."start" AS start`,
                `"ebu"."end" AS end`,
                `EXTRACT(MONTH FROM "ebu"."start") - EXTRACT(MONTH FROM "ebu"."end") AS "monthBoundaryStatus"`,
                `"ebu"."end"::DATE - "ebu"."start"::DATE + 1 AS "dateDiff"`,
                `EXTRACT(EPOCH FROM "ebu"."end" - "ebu"."start") AS "timeDiff"`,
                `"ebu"."approved" AS approved`,
            ])
            .leftJoin(Users, 'u', '"u"."id" = "ebu"."userId"')
            .where(`"ebu"."requestType" != 'own'`)
            .andWhere(`"u"."companyId" = ${companyId}`)
            .andWhere(`(
            ("ebu"."start" >= '${firstDay}' AND "ebu"."start" <= '${lastDay}') OR
            ("ebu"."end" >= '${firstDay}' AND "ebu"."end" <= '${lastDay}')
        )`)
            .andWhere(`"ebu"."approved" != -1`)
            .getQuery();

        // Query for all users
        const q2 = this.usersRepository.createQueryBuilder('u')
            .select([
                `"u"."id" AS id`,
                `"u"."avatar" AS avatar`,
                `"u"."firstName" AS "firstName"`,
                `"u"."lastName" AS "lastName"`,
                `'0'::TEXT AS "requestType"`, // Cast to TEXT
                `NULL AS start`,
                `NULL AS end`,
                `NULL AS "monthBoundaryStatus"`,
                `NULL AS "dateDiff"`,
                `NULL AS "timeDiff"`,
                `0 AS approved`,
            ])
            .where(`"u"."companyId" = ${companyId}`)
            .getQuery();

        // Combine and execute the UNION query
        const unionQuery = `${q1} UNION ${q2}`;
        return await this.entityManager.query(unionQuery);
    }

    async getAbsentToday (user: Users): Promise<EventsByUser[]>{
        const companyId: number = toSqlSafeInteger(user.companyId, 'companyId');
        const q = this.eventsByUserRepository.createQueryBuilder('ebu')
            .select([`
                concat(u.firstName, ' ', u.lastName) as name,
                ebu.requestType as type,
                u.avatar as avatar
                `
            ])
            .leftJoin(Users, 'u', 'u.id = ebu.userId')
            .where(`ebu.requestType != 'own'`)
            .andWhere(`u.companyId = ${companyId}`)
            .andWhere(`ebu.approved = 1`)
            .andWhere(`NOW() BETWEEN ebu.start AND ebu.end`)
        return await q.getRawMany();
    }
    async deleteOneWithRelations (id: number, entity: EventsByUser): Promise<DeleteResult> {
        return await this.entityManager.transaction(async transactionalEntityManager => {
            // return daysOff if event is request and not approved
            if (entity.isRequest && entity.approved === 0){
                const requestType: string = entity.requestType;
                const timeOffset: number = entity.timeOffset;
                const currentDaysOff: DaysOffEntity = await this.daysOffRepository.findOneOrFail({
                    where: { userId: entity.userId }
                });
                currentDaysOff[requestType] = +currentDaysOff[requestType] + timeOffset;
                // save new daysOff
                await this.daysOffRepository.save(currentDaysOff);
            }
            return await transactionalEntityManager.delete(EventsByUser, id);
        })
    }
    async createOneWithRelations (data: CreateEventsByUserDto, user: Users): Promise<{event: EventsByUser, userChiefEmails: string[]}> {

        return this.entityManager.transaction(async transactionalEntityManager => {
            data.userId = user.id;
            const eventEntity = Object.assign(new EventsByUser({}), data);
            const event = await transactionalEntityManager.save(eventEntity);
            const result = {
                event,
                userChiefEmails: []
            };
            if (event.isRequest){
                await transactionalEntityManager.decrement(DaysOffEntity, { userId: data.userId }, event.requestType, 1);
                // get user chief for sending email
                const userEntity = await transactionalEntityManager.findOne(Users, {
                    relations: ['userChiefRelations', 'userChiefRelations.chief'],
                    where: { id: user.id }
                });
                if (userEntity.userChiefRelations && userEntity.userChiefRelations.length > 0){
                    result.userChiefEmails = userEntity.userChiefRelations.map((relation: UserChiefRelationEntity) => relation.chief.email);
                }
            }
            return result
        });
    }
    async updateOneWithRelations (entityData: EventsByUser): Promise<EventsByUser> {
        return this.entityManager.transaction(async transactionalEntityManager => {
            const event = await transactionalEntityManager.save(entityData);
            return event
        });
    }
    async approveDisapproveEvent (token: string, status: number): Promise<{ event: EventsByUser, user: Users }> {
        return this.entityManager.transaction(async transactionalEntityManager => {
            const condition = { where: { secretToken: token } };
            const eventEntity: EventsByUser = await transactionalEntityManager.findOneOrFail(EventsByUser, condition);
            eventEntity.approved = status;
            eventEntity.secretToken = null;
            const event = await transactionalEntityManager.save(eventEntity);
            const user: Users = await transactionalEntityManager.findOne(Users, { where: { id: event.userId } });
            // get user chief for sending email
            return {
                event,
                user
            }
        });
    }
    async getPending (user: Users): Promise<EventsByUser[]> {
        const companyId: number = toSqlSafeInteger(user.companyId, 'companyId');
        const userRole: string = user.role;
        const userEmail: string = user.email;
        const qb = this.eventsByUserRepository.createQueryBuilder('ebu')
        qb.select([
            'user.id as "userId"',
            'user.firstName as "firstName"',
            'user.lastName as "lastName"',
            "user.company as company",
            'user.companyId as "companyId"',
            "ebu.id as id",
            "ebu.title as title",
            "ebu.requestType as type",
            "ebu.start as start",
            "ebu.end as end",
            'ebu.createdAt as "createdAt"'
        ])
            .leftJoin(Users, 'user', 'user.id = ebu.userId')
            .where(`ebu.requestType != 'own'`)
            .andWhere(`user.companyId = ${companyId}`)
            .andWhere(`ebu.approved = 0`)
        if (userRole === 'user'){
            qb.leftJoin(UserChiefRelationEntity, 'uCR', "u.id = uCR.userId");
            qb.andWhere(`uCR.chiefEmail = '${userEmail}'`)
        }
        qb.orderBy('ebu.createdAt');
        return await qb.getRawMany();
    }
}
