import { Body, Controller, Delete, Get, ParseIntPipe, Param, Post } from '@nestjs/common';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';

@Controller('api-tokens')
export class ApiTokensController {
    constructor (private readonly apiTokensService: ApiTokensService) {}

    @Post()
    create (
        @Body() createApiTokenDto: CreateApiTokenDto,
        @User() user: Users,
    ) {
        return this.apiTokensService.createToken(user, createApiTokenDto.name);
    }

    @Get()
    findAll (@User() user: Users) {
        return this.apiTokensService.findAllForUser(user.id);
    }

    @Delete(':id')
    revoke (
        @Param('id', ParseIntPipe) id: number,
        @User() user: Users,
    ): Promise<void> {
        return this.apiTokensService.revoke(id, user.id);
    }
}
