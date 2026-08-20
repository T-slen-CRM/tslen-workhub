import { UserGroupController } from '../../../../src/resources/user-group/user-group.controller';
import { TestBed } from '@automock/jest';
import { UserGroup } from '../../../../src/resources/user-group/entities/user-group.entity';
import { CreateUserGroupDto } from '../../../../src/resources/user-group/dto/create-user-group.dto';
import { mockUser } from '../../../shared/users';
import { Users } from '../../../../src/resources/users/entities/users.entity';

describe('UserGroupController', () => {
    let controller: UserGroupController;
    const mockedGroup = { id: 1, name: '' } as UserGroup;

    beforeEach(async () => {
        const { unit } = TestBed.create(UserGroupController).compile();
        controller = unit;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    it('should create new group', async () => {
        jest.spyOn(controller, 'create').mockResolvedValue(mockedGroup);
        const result = await controller.create(mockedGroup as unknown as CreateUserGroupDto);
        expect(controller.create).toHaveBeenCalled();
        expect(result).toEqual(mockedGroup);
    });
    it('should find all groups', async () => {
        const mockResponse = [mockedGroup];
        jest.spyOn(controller, 'findAll').mockResolvedValue(mockResponse);
        const result = await controller.findAll(mockUser as unknown as Users);
        expect(controller.findAll).toHaveBeenCalled();
        expect(result).toEqual(mockResponse);
    });
});
