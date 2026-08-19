import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskPhaseDto } from './create-task-phase.dto';

export class UpdateTaskPhaseDto extends PartialType(CreateTaskPhaseDto) {}
