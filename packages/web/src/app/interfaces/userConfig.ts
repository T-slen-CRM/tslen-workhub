import {IGoogleCalendar} from "./google";

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
    role: string;
    managerId: number;
    chiefId: number;
    useDarkTheme: number;
    tokenReset: string;
    tokenActivation: string;
    loginCount: number;
    lastLogin: string;
    firstDayInCompany: string;
    lastDayInCompany: string;
    emailSpare: string;
    password: string;
    daysOff: object;
    eventsByUsers: object;
    eventsByUsersRequest: object;
    userChiefRelations: object;
    userRelationToGroups: object;
    googleCalendars: IGoogleCalendar;
    group: string;
    value: number;
    userProbation: IUserProbation;
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
