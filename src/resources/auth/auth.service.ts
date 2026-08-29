import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignInResponseDto } from './dto/signIn.response.dto';
import { Users } from '../users/entities/users.entity';
import { ErrorExceptionMethod, ErrorService, IThrowErrorObject } from '../../common/services/error/error.service';
import { GoogleService } from '../../common/services/google/google.service';
import { configDotenv } from 'dotenv';
import * as path from 'path';
import { MoreThanOrEqual, IsNull } from 'typeorm';
import { IGoogleCalendar } from '../google-calendar/google-calendar.service';
configDotenv();
@Injectable()
export class AuthService {
    constructor (
      private usersService: UsersService,
      private jwtService: JwtService,
      private errorService: ErrorService,
      private googleService: GoogleService
    ) {
    }

    async signInWithPassword (email: string, password: string): Promise<SignInResponseDto> {
        try {
            const user: Users = await this.findActiveUserByEmail(email);
            const isMatchedPassword: boolean = await this.usersService.compareHashedValues(password, user.password);
            if (!isMatchedPassword) {
                const errorMessage = `signInWithPassword: ${email}, class: ${this.constructor.name}. Message: Invalid password`;
                const throwError: IThrowErrorObject = {
                    method: ErrorExceptionMethod.Unauthorized,
                    message: `Invalid password`
                };
                await this.errorService.aggregateError(errorMessage, null, throwError);
            }
            return await this.issueAccessToken(user);
        } catch (e) {
            const errorMessage = `signInWithPassword: ${email}, class: ${this.constructor.name}. Message: ${e.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.Unauthorized,
                message: `Cannot sign in: ${email}`
            };
            await this.errorService.aggregateError(errorMessage, null, throwError);
        }
    }

    // Only ever called internally, after `getAuthClientData(code)` has already verified the
    // caller's identity via a server-side Google OAuth code exchange - never bind these
    // arguments to a client-facing DTO/request body directly.
    async signInWithGoogle (email: string, googleAccessToken: string, googleRefreshToken: string, googlePermissions: IUserGooglePermissions): Promise<SignInResponseDto> {
        try {
            const user: Users = await this.findActiveUserByEmail(email);
            const tokenPath = path.join(process.cwd(), `credentials/token_${user.id}.json`);
            await this.googleService.saveCredentials({ credentials: { access_token: googleAccessToken, refresh_token: googleRefreshToken } }, tokenPath);
            const userGooglePermissions = user.googlePermissions || {};
            const assignedGooglePermissions = Object.assign(userGooglePermissions, googlePermissions);
            const updatedUser = await this.usersService.update(user.id, { googlePermissions: assignedGooglePermissions });
            user.googlePermissions = updatedUser.googlePermissions;
            return await this.issueAccessToken(user);
        } catch (e) {
            const errorMessage = `signInWithGoogle: ${email}, class: ${this.constructor.name}. Message: ${e.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.Unauthorized,
                message: `Cannot sign in: ${email}`
            };
            await this.errorService.aggregateError(errorMessage, null, throwError);
        }
    }

    private async findActiveUserByEmail (email: string): Promise<Users> {
        const user: Users = await this.usersService.findOneByCondition({
            where: [
                {
                    email,
                    isActive: 1,
                    lastDayInCompany: MoreThanOrEqual(new Date())
                },
                {
                    email,
                    isActive: 1,
                    lastDayInCompany: IsNull()
                }],
        });

        if (!user) {
            const errorMessage = `findActiveUserByEmail: ${email}, class: ${this.constructor.name}. Message: User not found`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot find user: ${email}`
            };
            await this.errorService.aggregateError(errorMessage, null, throwError);
        }
        return user;
    }

    private async issueAccessToken (user: Users): Promise<SignInResponseDto> {
        const userPayload: IUserPayloadJwt = new UserPayloadJwt(user);
        const payload: { user: IUserPayloadJwt } = { user: userPayload };
        const accessToken = await this.jwtService.signAsync(payload);
        return {
            accessToken
        };
    }

    async changeUser (id: number, adminUser: Users): Promise<{ user: Users; accessToken: string }> {
        try {
            // find user by id
            const user = await this.usersService.findOneById(id, adminUser);
            if (!user) {
                const errorMessage = `changeUser: ${id}. Class: ${this.constructor.name} Message: User not found`;
                const throwError: IThrowErrorObject = {
                    method: ErrorExceptionMethod.NotFound,
                    message: `Cannot find user: ${id}`
                };
                await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
            }
            // change user by changing jwt token and payload
            user.role = adminUser.role;
            const userPayload: IUserPayloadJwt = new UserPayloadJwt(user);
            const payload: { user: IUserPayloadJwt } = { user: userPayload };
            const accessToken = await this.jwtService.signAsync(payload);
            return {
                user,
                accessToken
            };
        } catch (e) {
            const errorMessage = `changeUser: ${id}. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot change user: ${id}`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);

        }
    }

    async googleAuth (): Promise<{ url: string}> {
        try {
            return await this.googleService.getOAuth2ClientUrl();
        } catch (e) {
            const errorMessage = `googleAuth. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot get google auth url`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    async getAuthClientData (code: string): Promise<{ email: string; refreshToken: string; accessToken: string }> {
        return await this.googleService.getAuthClientData(code);
    }
    async getGooglePermissions (scope: string): Promise<IUserGooglePermissions> {
        try {
            return this.googleService.getGooglePermissions(scope);
        } catch (e) {
            const errorMessage = `getGooglePermissions. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = {
                method: ErrorExceptionMethod.NotFound,
                message: `Cannot get google permissions`
            };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
}
export interface IUserPayloadJwt{
    id: number;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    avatar: string;
    company: string;
    address: string;
    phone: string;
    skype: string;
    emailSpare: string;
    isActive: number;
    companyId: number;
    chiefId: number;
    mentorId: number;
    birthDay: Date;
    firstDayInCompany: Date;
    lastDayInCompany: Date;
    googlePermissions: IUserGooglePermissions;
    googleCalendars: IGoogleCalendar;
    language: string;
}
export class UserPayloadJwt implements IUserPayloadJwt{
    id: number;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    avatar: string;
    company: string;
    address: string;
    phone: string;
    skype: string;
    emailSpare: string;
    isActive: number;
    companyId: number;
    chiefId: number;
    mentorId: number;
    birthDay: Date;
    firstDayInCompany: Date;
    lastDayInCompany: Date;
    googlePermissions: IUserGooglePermissions;
    googleCalendars: IGoogleCalendar;
    language: string;
    constructor (user: Users) {
        this.id = user.id;
        this.role = user.role;
        this.firstName = user.firstName;
        this.lastName = user.lastName;
        this.email = user.email;
        this.country = user.country;
        this.avatar = user.avatar;
        this.company = user.company;
        this.address = user.address;
        this.phone = user.phone;
        this.skype = user.skype;
        this.emailSpare = user.emailSpare;
        this.isActive = user.isActive;
        this.companyId = user.companyId;
        this.chiefId = user.chiefId;
        this.mentorId = user.mentorId;
        this.birthDay = user.birthDay;
        this.firstDayInCompany = user.firstDayInCompany;
        this.lastDayInCompany = user.lastDayInCompany;
        this.googlePermissions = user.googlePermissions;
        this.googleCalendars = user.googleCalendars;
        this.language = user.language;
    }
}
export interface IUserGooglePermissions {
    email: number;
    calendar: number;
    meetingSpace: number;
}
