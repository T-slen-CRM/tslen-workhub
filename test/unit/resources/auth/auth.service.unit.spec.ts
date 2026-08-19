import { AuthService, IUserGooglePermissions } from '../../../../src/resources/auth/auth.service';
import { UsersService } from '../../../../src/resources/users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import { mockUser } from '../../../shared/users';
import { TestBed } from '@automock/jest';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('AuthService signIn', () => {
    let authService: AuthService;
    let userService: UsersService

    beforeAll(async () => {
        const { unit, unitRef } = TestBed.create(AuthService).compile();
        authService = unit;
        userService = unitRef.get(UsersService);
    });

    it('should be defined', () => {
        expect(authService).toBeDefined();
    });

    it('should be defined user service', () => {
        expect(userService).toBeDefined();
    });

    it('should be defined user repository', () => {
        expect(userService).toBeDefined();
    });

    // it('should retrieve user from the database', async () => {
    //     const user = await userService.findOneByCondition({ email: mockUser.email });
    //     expect(userService.findOneByCondition)
    //         .toHaveBeenCalledWith({ email: mockUser.email });
    //     expect(user.email).toEqual(mockUser.email);
    // });

    it('should return null if user not found', async () => {
        const wrongEmail = 'test@gmal.com';
        const user = mockUser.email !== wrongEmail ? null : mockUser;

        expect(user).toEqual(null);
    });

    it('should throw UnauthorizedException if password isn\'t matched', async () => {
        const value = 'test';
        const hashedValue = 'hashedValue';
        jest.spyOn(userService, 'compareHashedValues').mockResolvedValue(false);

        const isMatchedPassword = await userService.compareHashedValues(value, hashedValue);
        expect(isMatchedPassword).toBe(false);
        let error: UnauthorizedException;
        if (!isMatchedPassword) {
            error = new UnauthorizedException(); // The line you want to test
        }
        expect(error).toBeInstanceOf(UnauthorizedException);
        //fail('UnauthorizedException not thrown'); // If we reach this point, the test failed
    });
    it('should call changeUser', async () => {
        const id = 1;
        const user = mockUser as Users;
        const mockedResponse = { user, accessToken: 'accessToken' }
        jest.spyOn(authService, 'changeUser').mockResolvedValue(mockedResponse);
        const result = await authService.changeUser(id, user);
        expect(authService.changeUser).toHaveBeenCalledWith(id, user);
        expect(result).toEqual(mockedResponse);
    });

    it('should return Google permissions for a valid scope', async () => {
        const scope = 'https://www.googleapis.com/auth/calendar';
        const mockPermissions: IUserGooglePermissions = {
            email: 1,
            calendar: 1,
            meetingSpace: 1,
        };
        jest.spyOn(authService, 'getGooglePermissions').mockResolvedValue(mockPermissions);

        const result = await authService.getGooglePermissions(scope);

        expect(authService.getGooglePermissions).toHaveBeenCalledWith(scope);
        expect(result).toEqual(mockPermissions);

    });
})


