import {GoogleCalendarInfo, Role} from "@tslen-workhub/shared";

export interface UserGeneralData {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    birthDay: string;
    country: string;
    phone: string;
    skype: string;
    address: string;
    jobPosition: string;
    jobPositionDetails: { id: number, title: string };
    companyId: number;
    company: string;
    isActive: number;
    role: Role;
    managerId: number;
    chiefId: number;
    useDarkTheme: number;
    loginCount: number;
    lastLogin: string;
    firstDayInCompany: string;
    lastDayInCompany: string;
    emailSpare: string;
    daysOff: object;
    eventsByUsers: IEventByUser[];
    eventsByUsersRequest: object;
    userChiefRelations: object;
    userRelationToGroups: object;
    googleCalendars: GoogleCalendarInfo;
    group: string;
    value: number;
    userProbation: IUserProbation;
}

// A row in the "eventsByUser" table, scoped to a date range via
// GET /users/:id?startDate&endDate (see UsersRepository.getOneWithRelations -
// this relation is only joined at all when both query params are given).
// Covers both real calendar events/meetings (isRequest false) and day-off
// requests (isRequest true, e.g. vacation/sick leave) - the two share this
// one table, so a consumer that only wants meetings must filter on
// isRequest itself.
export interface IEventByUser {
    id: number;
    title: string | null;
    start: string;
    end: string;
    isRequest: boolean;
    approved: number;
    requestType: string | null;
    isGoogleEvent: boolean;
    googleMeetLink: string | null;
}

interface IUserProbation {
    id: number;
    userId: number;
    start: string;
    end: string;
    isProbation: number;
}

interface IUserChiefRelationsByName {
    chiefEmail: string;
    chiefId: number;
    chiefName: string;
}

export type IUserChiefRelationsObject = Record<string, IUserChiefRelationsByName[]>;
