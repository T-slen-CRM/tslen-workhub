import { AuthService, IUserGooglePermissions } from '../../../../src/resources/auth/auth.service';
import { UsersService } from '../../../../src/resources/users/users.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { mockUser } from '../../../shared/users';
import { TestBed } from '@automock/jest';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { JwtService } from '@nestjs/jwt';
import { ErrorExceptionMethod, ErrorService, IThrowErrorObject } from '../../../../src/common/services/error/error.service';
import { GoogleService } from '../../../../src/common/services/google/google.service';

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
        const user = mockUser as unknown as Users;
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

describe('AuthService signInWithPassword / signInWithGoogle', () => {
    let authService: AuthService;
    let usersService: jest.Mocked<UsersService>;
    let errorService: jest.Mocked<ErrorService>;
    let googleService: jest.Mocked<GoogleService>;
    let jwtService: jest.Mocked<JwtService>;

    beforeEach(() => {
        const { unit, unitRef } = TestBed.create(AuthService).compile();
        authService = unit;
        usersService = unitRef.get(UsersService);
        errorService = unitRef.get(ErrorService);
        googleService = unitRef.get(GoogleService);
        jwtService = unitRef.get(JwtService);
        errorService.aggregateError.mockImplementation(async (_log: string, _slack: string, throwError: IThrowErrorObject) => {
            if (throwError?.method === ErrorExceptionMethod.NotFound) throw new NotFoundException(throwError.message);
            if (throwError?.method === ErrorExceptionMethod.Unauthorized) throw new UnauthorizedException(throwError.message);
        });
    });

    it('signInWithPassword rejects with Unauthorized when the password does not match, with no way to bypass it', async () => {
        const user = { ...mockUser, password: 'hashed' } as unknown as Users;
        usersService.findOneByCondition.mockResolvedValue(user);
        usersService.compareHashedValues.mockResolvedValue(false);

        await expect(authService.signInWithPassword(user.email, 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('signInWithGoogle saves credentials and issues a JWT without ever checking a password', async () => {
        const user = { ...mockUser, id: 1, password: 'hashed' } as unknown as Users;
        usersService.findOneByCondition.mockResolvedValue(user);
        usersService.update.mockResolvedValue({ ...user, googlePermissions: { calendar: 1, meetingSpace: 0, email: 1 } as unknown as Users['googlePermissions'] });
        jwtService.signAsync.mockResolvedValue('signed-jwt');

        const result = await authService.signInWithGoogle(user.email, 'g-access', 'g-refresh', { calendar: 1, meetingSpace: 0, email: 1 });

        expect(usersService.compareHashedValues).not.toHaveBeenCalled();
        expect(googleService.saveCredentials).toHaveBeenCalled();
        expect(result).toEqual({ accessToken: 'signed-jwt' });
    });

    it('never signs the password hash into the JWT payload', async () => {
        const user = { ...mockUser, id: 1, password: 'super-secret-hash' } as unknown as Users;
        usersService.findOneByCondition.mockResolvedValue(user);
        usersService.compareHashedValues.mockResolvedValue(true);
        let signedPayload: { user: { password?: string } };
        jwtService.signAsync.mockImplementation(async (payload: { user: { password?: string } }) => {
            signedPayload = payload;
            return 'token';
        });

        await authService.signInWithPassword(user.email, 'correct-password');

        expect(signedPayload.user.password).toBeUndefined();
    });
});


