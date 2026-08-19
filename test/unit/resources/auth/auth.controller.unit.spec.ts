import { AuthController } from '../../../../src/resources/auth/auth.controller';
import { AuthService } from '../../../../src/resources/auth/auth.service';
import { SignInDto } from '../../../../src/resources/auth/dto/signIn.dto';
import { TestBed } from '@automock/jest';
import { mockUser } from '../../../shared/users';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    beforeAll(async () => {
        const { unit, unitRef } = TestBed.create(AuthController).compile();
        controller = unit;
        authService = unitRef.get(AuthService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call authService.signIn with correct parameters', async () => {
        const signInDto: SignInDto = {
            email: 'test@example.com',
            password: 'password123',
            skipPasswordCheck: true,
            googleAccessToken: 'google',
            googleRefreshToken: 'google',
            googlePermissions: {
                email: 1,
                calendar: 1,
                meetingSpace: 1
            },
        };

        // Mock the expected response from the service
        const mockResponse = { accessToken: 'sampleToken' };

        jest.spyOn(authService, 'signIn').mockResolvedValue(mockResponse);

        const result = await controller.signIn(signInDto);
        // Verify the AuthService.signIn method is called with the correct parameters
        expect(authService.signIn).toHaveBeenCalledWith({ "email": "test@example.com", "googleAccessToken": "google", "googleRefreshToken": "google", googlePermissions: {
            email: 1, calendar: 1, meetingSpace: 1 }, "password": "password123", "skipPasswordCheck": true });

        // Verify the expected response from the controller
        expect(result).toEqual(mockResponse);
    });
    it('should call changeUser', async () => {
        const accessToken = 'sampleToken';
        jest.spyOn(authService, 'changeUser').mockResolvedValue({ user: mockUser, accessToken } as { user: Users; accessToken: string });
        const result = await controller.changeUser(mockUser as Users, mockUser.id);
        expect(authService.changeUser).toHaveBeenCalledWith(mockUser.id, mockUser);
        expect(result).toEqual({ user: mockUser, accessToken });
    });
});
