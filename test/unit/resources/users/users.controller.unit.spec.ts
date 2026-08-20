
import { UsersController } from '../../../../src/resources/users/users.controller';
import { TestBed } from '@automock/jest';
import { UsersService } from '../../../../src/resources/users/users.service';
import { Users } from '../../../../src/resources/users/entities/users.entity';
import { mockUser } from '../../../shared/users';

describe('UsersController', () => {
    let controller: UsersController;
    let userService: jest.Mocked<UsersService>;

    beforeAll(async () => {
        const { unit, unitRef } = TestBed.create(UsersController).compile();
        controller = unit;
        userService = unitRef.get(UsersService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it ('should call userService.findAll', async () => {
        const mockResponse: Partial<Users>[] = [
            { id: 1, firstName: 'John', lastName: 'Doe', email: 'test' },
        ];

        jest.spyOn(userService, 'findAll').mockResolvedValue(mockResponse as Users[]);

        const result = await controller.findAll(mockUser as unknown as Users);
        expect(userService.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    })

    it ('should call userService.findOneById', async () => {
        const mockResponse: Partial<Users> = { id: 1, firstName: 'John', lastName: 'Doe', email: 'test' };

        jest.spyOn(userService, 'findOneById').mockResolvedValue(mockResponse as Users);

        const result = await controller.findOne({} as Users, 1);
        expect(userService.findOneById).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    })
    it('should call userService.create', async () => {
        const mockResponse: Partial<Users> = { id: 1, firstName: 'John', lastName: 'Doe', email: 'test' };

        jest.spyOn(userService, 'create').mockResolvedValue(mockResponse as Users);

        const result = await controller.create(mockUser);
        expect(userService.create).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it ('should call userService.update', async () => {
        const mockResponse: Partial<Users> = mockUser as unknown as Users;

        jest.spyOn(userService, 'update').mockResolvedValue(mockResponse as Users);

        const result = await controller.update(1, mockUser);
        expect(userService.update).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    })
    it('should call userService.create', async () => {
        const mockResponse: Partial<Users> = { id: 1, firstName: 'John', lastName: 'Doe', email: 'test' };

        jest.spyOn(userService, 'create').mockResolvedValue(mockResponse as Users);

        const result = await controller.create(mockUser);
        expect(userService.create).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it ('should call userService.getBirthdayAnniversary', async () => {
        const mockResponse: Partial<Users> = mockUser as unknown as Users;

        jest.spyOn(userService, 'getBirthdayAnniversary').mockResolvedValue(mockResponse as Users);

        const result = await controller.getBirthdayAnniversary(mockUser as unknown as Users);
        expect(userService.getBirthdayAnniversary).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    })
    it('should call userService.getUsersWithRelationsByDateRange', async () => {
        const mockResponse: Partial<Users>[] = [
            { id: 1, firstName: 'John', lastName: 'Doe', email: 'test' },
        ];

        jest.spyOn(userService, 'getUsersWithRelationsByDateRange').mockResolvedValue(mockResponse as Users[]);

        const result = await controller.readAllFromByDateRange(mockUser as unknown as Users, { startDate: new Date(), endDate: new Date() });
        expect(userService.getUsersWithRelationsByDateRange).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
    it('should call userService.getProfileAvatar and userService.update', async () => {
        const mockResponse: Partial<Users> = mockUser as unknown as Users;
        const avatarPath = 'http://localhost:3000/api/v1/profile-avatar/1_1234567890_avatar.jpg';
        jest.spyOn(userService, 'getProfileAvatarPath').mockReturnValue(avatarPath);
        jest.spyOn(userService, 'update').mockResolvedValue(mockResponse as Users);
        const result = await controller.update(1, mockUser);
        expect(userService.update).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);

    });
    it('should call userService.create', async () => {
        const mockResponse: Partial<Users> = { id: 1, firstName: 'John', lastName: 'Doe', email: 'test' };

        jest.spyOn(userService, 'create').mockResolvedValue(mockResponse as Users);

        const result = await controller.createFromSingUp(mockUser);
        expect(userService.create).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
});
