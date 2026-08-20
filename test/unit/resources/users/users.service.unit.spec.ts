import { TestBed } from '@automock/jest';
import { UsersService } from '../../../../src/resources/users/users.service';
import { mockUser } from '../../../shared/users';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('Users Service Unit Test', () => {
    let userService: UsersService;
    beforeAll(() => {
        const { unit } = TestBed.create(UsersService).compile();
        userService = unit;
    });
    it('should be defined', () => {
        expect(userService).toBeDefined();
    });

    it('should hash a value', async () => {
        const value = 'test';
        const hashedValue = 'hashedValue';
        jest.spyOn(userService, 'hashValue').mockResolvedValue(hashedValue);

        const result = await userService.hashValue(value);
        expect(result).toEqual(hashedValue);
    });

    it('should compare hashed values', async () => {
        const value = 'test';
        const hashedValue = 'hashedValue';
        jest.spyOn(userService, 'compareHashedValues').mockResolvedValue(true);

        const result = await userService.compareHashedValues(value, hashedValue);
        expect(result).toEqual(true);
    });
    it('should get birthday anniversary', async () => {
        const result = mockUser;
        jest.spyOn(userService, 'getBirthdayAnniversary').mockResolvedValue(mockUser as unknown as Users);

        const res = await userService.getBirthdayAnniversary(mockUser as unknown as Users);
        expect(res).toEqual(result);
    });
    it('should get users with relations by date range', async () => {
        const result = [mockUser];
        jest.spyOn(userService, 'getUsersWithRelationsByDateRange').mockResolvedValue([mockUser] as unknown as Users[]);

        const res = await userService.getUsersWithRelationsByDateRange(mockUser as unknown as Users, { startDate: new Date(), endDate: new Date() });
        expect(res).toEqual(result);
    });
    it('should get profile avatar', () => {
        const fileName = '1_avatar.jpg';
        const result = { file: fileName, settings: { root: '' } };
        jest.spyOn(userService, 'getProfileAvatar').mockReturnValue(result);
        expect(userService.getProfileAvatar(mockUser as unknown as Users, fileName)).toEqual(result);
    });
    it('should get profile avatar path', () => {
        const fileName = '1_avatar.jpg';
        const result = 'http://localhost:3000/api/v1/profile-avatar/1_avatar.jpg';
        jest.spyOn(userService, 'getProfileAvatarPath').mockReturnValue(result);
        expect(userService.getProfileAvatarPath(fileName)).toEqual(result);
    });
});
