import { Controller, Get, UseGuards } from '@nestjs/common';
import { ExternalTasksService } from './external-tasks.service';
import { ApiTokenGuard } from '../api-tokens/guards/api-token.guard';
import { SkipAuth } from '../auth/decorators/public.guard';

@Controller('external/projects')
@UseGuards(ApiTokenGuard)
@SkipAuth()
export class ExternalProjectsController {
    constructor (private readonly externalTasksService: ExternalTasksService) {}

    @Get()
    findAll (): Promise<{ id: number; name: string; phases: { id: number; name: string }[] }[]> {
        return this.externalTasksService.listProjects();
    }
}
