import {
    Body,
    Controller,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Users } from './entities/users.entity';
import { User } from './decorators/user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatesRangeDto } from '../../common/dto/dates-range.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { FileExtensionValidatorPipe } from './pipes/file-extension-validator.pipe';
import { SkipAuth } from '../auth/decorators/public.guard';
import { generateAvatarFilename } from './utils/generate-avatar-filename';

@Controller('users')
export class UsersController {
    constructor (private readonly usersService: UsersService) {}

    @Post()
    create (@Body() createUserDto: CreateUserDto): Promise<Users> {
        return this.usersService.create(createUserDto);
    }
    @Get()
    findAll (@User() user: Users): Promise<Users[]> {
        return this.usersService.findAll(user);
    }
    @Get(':id([0-9]+)')
    findOne (@User() user: Users, @Param('id', ParseIntPipe) id: number): Promise<Users> {
        return this.usersService.findOneById(id, user);
    }
    @Patch(':id')
    update (
      @Param('id', ParseIntPipe) id: number,
      @Body() updateUserDto: UpdateUserDto
    ): Promise<Users> {
        return this.usersService.update(id, updateUserDto);
    }
    @Get('/birthday-anniversary')
    async getBirthdayAnniversary (@User() user: Users): Promise<Users> {
        return await this.usersService.getBirthdayAnniversary(user);
    }
    @Get('/get-with-relations-by-date-range')
    async readAllFromByDateRange (@User() user: Users, @Query() params: DatesRangeDto): Promise<Users[]> {
        return await this.usersService.getUsersWithRelationsByDateRange(user, params);
    }
    @Post('/profile-avatar/:userId')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './upload/users/profile-avatar',
            filename: (req: Request, file: Express.Multer.File, cb) => {
                cb(null, generateAvatarFilename(req.params.userId, file.originalname));
            }
        })
    }))
    async uploadFile (@User() user: Users,
                      @UploadedFile(
                          new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })] }), // 2MB
                          new FileExtensionValidatorPipe()
                      ) file: Express.Multer.File,
                      @Param('userId', ParseIntPipe) userId: number): Promise<Users> {
        this.usersService.validateUserIdByRole(userId, user);
        const avatarPath = await this.usersService.uploadFile(file);
        const updateUserDto = { id: userId, avatar: avatarPath };
        return this.usersService.update(userId, updateUserDto);
    }
    @SkipAuth()
    @Post('signup')
    createFromSingUp (@Body() createUserDto: CreateUserDto): Promise<Users> {
        return this.usersService.create(createUserDto);
    }
}
