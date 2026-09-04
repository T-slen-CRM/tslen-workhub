import { Injectable, NotFoundException } from '@nestjs/common';
import { Users } from './entities/users.entity';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { BaseAbstractService } from '../../common/services/base/base.abstract.service';
import { BaseInterfaceService } from '../../common/services/base/base.interface.service';
import { DatesRangeDto } from '../../common/dto/dates-range.dto';
import { OptionalDatesRangeDto } from '../../common/dto/optional-dates-range.dto';
import { ConfigService } from '@nestjs/config';
import { Role } from '@tslen-workhub/shared';
import { UploadAbstractService } from '../../common/services/upload/upload.abstract.service';
import { ErrorExceptionMethod, ErrorService } from '../../common/services/error/error.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService extends BaseAbstractService<Users> implements BaseInterfaceService{
    constructor (
    protected readonly repository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadAbstractService,
    protected readonly errorService: ErrorService,
    ) {
        super(repository, errorService);
        this.currentRepository = repository;
    }
    async hashValue (value: string): Promise<string> {
        const salt = bcrypt.genSaltSync();
        return bcrypt.hash(value, salt);
    }
    async compareHashedValues (value: string, hashedValue: string): Promise<boolean> {
        return bcrypt.compare(value, hashedValue);
    }
    public async getBirthdayAnniversary (user: Users): Promise<Users> {
        try {
            return await this.currentRepository.getBirthdayAnniversary(user);
        } catch (err) {
            const errorMessage = `getBirthdayAnniversary: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot get birthday anniversary for user: ${user.id}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    async findOneById (id: number, user: Users, dateRange?: OptionalDatesRangeDto): Promise<Users> {
        try {
            return await this.currentRepository.getOneWithRelations(id, user, dateRange);
        } catch (err) {
            const errorMessage = `findOneById: ${id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot find the entity for ${id}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    public async getUsersWithRelationsByDateRange (user: Users, dateParams: DatesRangeDto): Promise<Users[]> {
        try {
            return await this.currentRepository.getUsersWithRelationsByDateRange(user, dateParams);
        } catch (err) {
            const errorMessage = `getUsersWithRelationsByDateRange: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot get users with relations by date range for user: ${user.id}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    public async findLookupList (user: Users): Promise<Pick<Users, 'id' | 'firstName' | 'lastName' | 'avatar'>[]> {
        try {
            return await this.currentRepository.getLookupList(user);
        } catch (err) {
            const errorMessage = `findLookupList: ${user.id}, class: ${this.constructor.name}. Message: ${err.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot get user lookup list for company: ${user.companyId}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    public getProfileAvatar (user: Users, fileName: string): {file: string, settings: { root: string }} {
        const userId = user.id;
        const fileUserId = +(fileName.split('_')[0]);
        if (!fileUserId || userId !== fileUserId) {
            throw new NotFoundException(`File ${fileName} not found`);
        } else {
            return { file: fileName, settings: { root: this.configService.get('MULTER_DEST') + this.configService.get('PROFILE_AVATAR_DIR') } }
        }
    }
    public getProfileAvatarPath (fileName: string): string {
        return this.configService.get('BACKEND_DOMAIN') + '/api/v' + this.configService.get('API_VERSION') + this.configService.get('PROFILE_AVATAR_DIR') + '/' + fileName;
    }
    public validateUserIdByRole (userId: number, user: Users): void {
        if (user.role === Role.User && user.id !== userId) {
            throw new NotFoundException(`User ${userId} not found`);
        }
    }
    public async uploadFile (file: Express.Multer.File): Promise<string> {
        try {
            const imageUrl: string[] = await this.uploadService.uploadImage(file, 'profile/');
            return imageUrl[0];
        } catch (e) {
            const errorMessage = `uploadFileToCDN: ${file.originalname}, class: ${this.constructor.name}. Message: ${e.message}`;
            const throwError = { method: ErrorExceptionMethod.NotFound, message: `Cannot upload file to CDN for: ${file.originalname}` };
            await this.errorService.aggregateError(errorMessage, errorMessage, throwError);
        }
    }
    async create (createUserDto: CreateUserDto): Promise<Users> {
        createUserDto.password = await this.hashValue(createUserDto.password);
        return this.currentRepository.createOneWithRelations(createUserDto);
    }
    async update (id: number, updateUserDto: UpdateUserDto): Promise<Users> {
        if (updateUserDto.password) {
            updateUserDto.password = await this.hashValue(updateUserDto.password);
        }
        return this.currentRepository.updateOneWithRelations({ id, ...updateUserDto });
    }
}
