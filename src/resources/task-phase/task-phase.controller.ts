import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { TaskPhaseService } from './task-phase.service';
import { CreateTaskPhaseDto } from './dto/create-task-phase.dto';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { TaskPhase } from './entities/task-phase.entity';
import { UpdateTaskPhaseDto } from './dto/update-task-phase.dto';
import { DeleteResult } from 'typeorm';

@Controller('task-phase')
export class TaskPhaseController {
    constructor (private readonly taskPhaseService: TaskPhaseService) {}

  @Post()
    create (@Body() createTaskPhaseDto: CreateTaskPhaseDto): Promise<TaskPhase> {
        return this.taskPhaseService.create(createTaskPhaseDto);
    }

  @Get()
  findAll (@User() user: Users): Promise<TaskPhase[]> {
      return this.taskPhaseService.findAll(user);
  }
  @Patch(':id')
  update (@Param('id', ParseIntPipe) id: number, @Body() updateTaskPhaseDto: UpdateTaskPhaseDto): Promise<TaskPhase> {
      return this.taskPhaseService.update(id, updateTaskPhaseDto);
  }
   @Delete(':id')
  remove (@Param('id', ParseIntPipe) id: number): Promise<DeleteResult> {
      return this.taskPhaseService.delete(id);
  }
}
