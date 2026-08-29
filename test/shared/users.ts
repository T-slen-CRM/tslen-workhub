import { Role } from '@tslen-workhub/shared';
import { CreateUserDto } from 'src/resources/users/dto/create-user.dto';
import { UserProbationDto } from 'src/resources/users/dto/userProbation.dto';

export const mockUser: CreateUserDto = {
    address: '',
    avatar: '',
    birthDay: null,
    chiefId: 0,
    company: '',
    companyId: 4,
    country: '',
    daysOff: [],
    emailSpare: '',
    eventsByUsers: [],
    eventsByUsersRequest: [],
    firstDayInCompany: null,
    firstName: '',
    googleCalendars: {
        id: 1,
        userId: 1,
        calendarId: '1',
        timezone: 'Europe/Kiev',
        user: {} as CreateUserDto
    },
    isActive: 0,
    jobPosition: '',
    jobPositionDetails: [],
    lastDayInCompany: null,
    lastLogin: null,
    lastName: '',
    loginCount: 0,
    mentorId: 0,
    password: '',
    phone: '',
    role: Role.User,
    skype: '',
    taskProjectPermissions: [],
    tokenActivation: '',
    tokenReset: '',
    userChiefRelations: [],
    userChiefRelationsByChief: [],
    userProbation: {} as UserProbationDto,
    userRelationToGroups: [],
    id: 1,
    email: 'test@gmail.com',
    taskUserAssignmentRelations: [],
    googlePermissions: {
        email: 1,
        calendar: 1,
        meetingSpace: 1,
    },
    language: 'en'
};
