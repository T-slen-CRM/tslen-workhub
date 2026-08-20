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

    it('should call authService.signInWithPassword with the DTO email/password, and nothing else client-controlled', async () => {
        const signInDto: SignInDto = {
            email: 'test@example.com',
            password: 'password123',
        };

        // Mock the expected response from the service
        const mockResponse = { accessToken: 'sampleToken' };

        jest.spyOn(authService, 'signInWithPassword').mockResolvedValue(mockResponse);

        const result = await controller.signIn(signInDto);
        // Verify the AuthService.signInWithPassword method is called with only email/password -
        // there is no longer a way for a request body to skip the password check.
        expect(authService.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123');

        // Verify the expected response from the controller
        expect(result).toEqual(mockResponse);
    });
    it('should call changeUser', async () => {
        const accessToken = 'sampleToken';
        jest.spyOn(authService, 'changeUser').mockResolvedValue({ user: mockUser, accessToken } as unknown as { user: Users; accessToken: string });
        const result = await controller.changeUser(mockUser as unknown as Users, mockUser.id);
        expect(authService.changeUser).toHaveBeenCalledWith(mockUser.id, mockUser);
        expect(result).toEqual({ user: mockUser, accessToken });
    });
});
