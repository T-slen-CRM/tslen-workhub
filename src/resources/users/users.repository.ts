import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { Users } from './entities/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { CompanyDaysOffRules } from '../company-days-off-rules/entities/company-days-off-rules.entity';
import { DaysOffEntity } from '../company-days-off-rules/entities/days-off.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { toSqlSafeInteger } from '../../common/utils/sql-safe-integer';
import { activeUserCondition } from './utils/active-user-condition.util';

export class UsersRepository extends BaseAbstractRepository<Users>{
    constructor (
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private entityManager: EntityManager,
    @InjectRepository(CompanyDaysOffRules)
    private readonly companyDaysOffRulesRepository: Repository<CompanyDaysOffRules>,
    ) {
        super(usersRepository);
    }

    public async getOneWithRelations (id: number, user: Users, dateRange?: { startDate?: Date, endDate?: Date }): Promise<Users> {
        const companyId: number = user.companyId;
        const userRole: string = user.role;
        let userId: number = user.id;
        const whereCondition: Partial<Users> = {};
        if (userRole === 'manager' || userRole === 'admin'){
            userId = id;
            whereCondition.companyId = companyId;
        }
        whereCondition.id = userId;

        const qb = this.usersRepository.createQueryBuilder('user')
            .where(whereCondition)
            .leftJoinAndSelect('user.userRelationToGroups', 'userRelationToGroups')
            .leftJoinAndSelect('user.daysOff', 'daysOff')
            .leftJoinAndSelect('user.eventsByUsersRequest', 'eventsByUsersRequest', 'eventsByUsersRequest.isRequest = true')
            .leftJoinAndSelect('user.userChiefRelations', 'userChiefRelations')
            .leftJoinAndSelect('user.googleCalendars', 'googleCalendars')
            .leftJoinAndSelect('user.userProbation', 'userProbation')
            .leftJoinAndSelect('user.googlePermissions', 'googlePermissions')

        // eventsByUsers (+ its attendees) is a heavy, per-event join - only
        // fetch it when the caller actually wants a bounded window of events
        // (the personal calendar, which always passes a date range). Every
        // other caller (user-profile, the user card) never reads this
        // relation at all, so skip the join entirely rather than eagerly
        // loading every event + attendee the user has ever had.
        if (dateRange?.startDate && dateRange?.endDate) {
            // endDate arrives as a date-only value (midnight UTC) - normalize to
            // end-of-day so the last calendar day of the range isn't silently
            // excluded, unlike the sibling getUsersWithRelationsByDateRange below.
            const endOfEndDate = new Date(dateRange.endDate);
            endOfEndDate.setUTCHours(23, 59, 59, 999);
            const eventsByUsersCondition = 'eventsByUsers.approved != -1 AND (eventsByUsers.start BETWEEN :startDate AND :endDate OR eventsByUsers.end BETWEEN :startDate AND :endDate)';
            qb.leftJoinAndSelect('user.eventsByUsers', 'eventsByUsers', eventsByUsersCondition, { startDate: dateRange.startDate, endDate: endOfEndDate })
                .leftJoinAndSelect('eventsByUsers.attendees', 'eventsAttendees');
        }

        const result = await qb.getOne();

        for (let i = 0; i < (result.eventsByUsers?.length ?? 0); i++){
            result.eventsByUsers[i].start = this.convertDateWithoutTimezoneOffset(result.eventsByUsers[i].start);
            result.eventsByUsers[i].end = this.convertDateWithoutTimezoneOffset(result.eventsByUsers[i].end);
        }

        return result
    }
    public async getByRole (user: Users, id: number = null): Promise<Users[] | Users> {
        const qb = this.usersRepository.createQueryBuilder('user');
        const companyId: number = user.companyId;

        qb.select()
            .leftJoinAndSelect('user.eventsByUsers', 'eventsByUsers', 'eventsByUsers.approved = 1 and eventsByUsers.isGoogleEvent = true')
            .leftJoinAndSelect('user.userProbation', 'userProbation')
            .leftJoinAndSelect('user.jobPositionDetails', 'jobPositionDetails')
            .leftJoinAndSelect('user.userChiefRelations', 'userChiefRelations', 'userChiefRelations.userId = user.id')
            .leftJoinAndSelect('userChiefRelations.user', 'userChiefRelationsUser')
            .leftJoinAndSelect('userChiefRelations.chief', 'userChiefRelationsChief');
        qb.where("user.companyId = :companyId", { companyId: companyId })
        qb.andWhere('user.isActive = 1');
        qb.andWhere('(user.lastDayInCompany IS NULL OR user.lastDayInCompany >= :now)', { now: new Date() });
        if (id) {
            qb.andWhere("user.id = :id", { id })
            return await qb.getOne();
        }
        qb.orderBy('user.id', "DESC")
        return await qb.getMany();
    }
    // A lightweight "reference" list for pickers (chief/mentor dropdowns and
    // the like) that only ever display a name - no relations, unlike
    // getByRole, which eager-loads events/probation/job-position/chief
    // relations for every company user and is overkill when all a caller
    // wants is id/name/avatar to populate a <mat-select>.
    public getLookupList (user: Users): Promise<Pick<Users, 'id' | 'firstName' | 'lastName' | 'avatar'>[]> {
        const companyId: number = user.companyId;
        const qb = this.usersRepository.createQueryBuilder('user')
            .select(['user.id', 'user.firstName', 'user.lastName', 'user.avatar'])
            .where('user.companyId = :companyId', { companyId })
            .andWhere(activeUserCondition('user'))
            .orderBy('user.firstName', 'ASC');
        return qb.getMany();
    }
    async createOneWithRelations (creteUserDto: CreateUserDto): Promise<Users> {
        return await this.entityManager.transaction(async transactionalEntityManager => {
            const userEntity: Users = Object.assign(new Users({}), creteUserDto);
            const savedUser = await transactionalEntityManager.save(userEntity);

            const companyDaysOffRules: CompanyDaysOffRules = await this.companyDaysOffRulesRepository.findOneBy({ companyId: savedUser.companyId });
            const userDaysOff: DaysOffEntity = Object.assign(new DaysOffEntity({}), companyDaysOffRules);
            userDaysOff.id = null;
            userDaysOff.userId = savedUser.id;
            userDaysOff.companyId = savedUser.companyId;
            await transactionalEntityManager.save(userDaysOff);
            return savedUser;
        });
    }
    updateOneWithRelations (updateUserDto: UpdateUserDto): Promise<Users> {
        return this.entityManager.transaction(async transactionalEntityManager => {
            const userEntity: Users = await transactionalEntityManager.findOne(Users, { where: { id: updateUserDto.id } });
            if (!userEntity) {
                throw new Error('User not found');
            }
            const updatedUser = Object.assign(userEntity, updateUserDto);
            return await transactionalEntityManager.save(updatedUser);
        });
    }
    public convertDateWithoutTimezoneOffset (date: Date): any {
        if (!date) {
            return null;
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    public async getBirthdayAnniversary (user: Users): Promise<Users[]> {
        const qb: SelectQueryBuilder<Users> = this.usersRepository.createQueryBuilder('user');
        const companyId: number = toSqlSafeInteger(user.companyId, 'companyId');

        // Query for birthdays
        const q1: string = qb
            .select(`CONCAT("firstName", ' ', "lastName") as name, avatar, 'birthday' as type, "birthDay" as day`)
            .where(`"companyId" = ${companyId}`)
            .andWhere(`TO_CHAR("birthDay", 'MM-DD') BETWEEN TO_CHAR(NOW(), 'MM-DD') AND TO_CHAR(NOW() + INTERVAL '30 days', 'MM-DD')`)
            .andWhere(activeUserCondition('user'))
            .getQuery();

        // Query for anniversaries
        const q2: string = qb
            .select(`CONCAT("firstName", ' ', "lastName") as name, avatar, 'anniversary' as type, "firstDayInCompany" as day`)
            .where(`"companyId" = ${companyId}`)
            .andWhere(`TO_CHAR("firstDayInCompany", 'MM-DD') BETWEEN TO_CHAR(NOW(), 'MM-DD') AND TO_CHAR(NOW() + INTERVAL '30 days', 'MM-DD')`)
            .andWhere(`EXTRACT(YEAR FROM "firstDayInCompany") != EXTRACT(YEAR FROM NOW())`)
            .andWhere(activeUserCondition('user'))
            .getQuery();

        // Combine the two queries with UNION
        return await this.entityManager.query(`${q1} UNION ${q2}`);
    }
    public async getUsersWithRelationsByDateRange (user: Users, { startDate, endDate }): Promise<Users[]> {
        const qb: SelectQueryBuilder<Users> = this.usersRepository.createQueryBuilder('user');
        const companyId = toSqlSafeInteger(user.companyId, 'companyId');
        startDate = startDate.toISOString();
        endDate = endDate.toISOString();
        qb.select();
        qb.where(`"companyId" = ${companyId}`)
            .andWhere(activeUserCondition('user'))
            .leftJoinAndSelect('user.eventsByUsers', 'eventsByUsers',
                `eventsByUsers.approved = 1 
                          and eventsByUsers.isGoogleEvent = false
                          and (eventsByUsers.start BETWEEN '${startDate}' AND '${endDate}'
                          or eventsByUsers.end BETWEEN '${startDate}' AND '${endDate}')`)
            .leftJoinAndSelect('user.userProbation', 'userProbation',
                `(userProbation.start BETWEEN '${startDate}' AND '${endDate}'
                          or userProbation.end BETWEEN '${startDate}' AND '${endDate}')`)
        qb.orderBy('user.id', "DESC");
        const result = await qb.getMany();

        // Same normalization getOneWithRelations applies below - without it,
        // these raw Date objects serialize with a UTC 'Z' suffix, and the
        // common-schedule calendar view's mwl-calendar-month-view places an
        // event by LOCAL day. A day-off's end (23:59 UTC) then lands after
        // local midnight for any timezone ahead of UTC, badging the event on
        // the following calendar day too.
        for (const oneUser of result) {
            for (let i = 0; i < oneUser.eventsByUsers.length; i++) {
                oneUser.eventsByUsers[i].start = this.convertDateWithoutTimezoneOffset(oneUser.eventsByUsers[i].start);
                oneUser.eventsByUsers[i].end = this.convertDateWithoutTimezoneOffset(oneUser.eventsByUsers[i].end);
            }
        }

        return result;
    }
}
