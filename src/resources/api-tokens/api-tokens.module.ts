import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensRepository } from './api-tokens.repository';
import { ApiToken } from './entities/api-token.entity';
import { ApiTokenGuard } from './guards/api-token.guard';

@Module({
    imports: [TypeOrmModule.forFeature([ApiToken])],
    controllers: [ApiTokensController],
    providers: [ApiTokensService, ApiTokensRepository, ApiTokenGuard],
    exports: [ApiTokensRepository, ApiTokenGuard],
})
export class ApiTokensModule {}
