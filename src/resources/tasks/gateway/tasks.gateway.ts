import {
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';
import { TasksService } from '../tasks.service';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UsePipes } from '@nestjs/common/decorators/core/use-pipes.decorator';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { UseInterceptors } from '@nestjs/common';
import { AuditLogWsInterceptor } from '../../../common/interceptors/audit-log-ws.interceptor';
export const enum TasksEvents {
  UPDATE = 'update',
  CREATE = 'create',
  MULTI_REORDERING = 'multi-reordering',
  DELETE = 'delete',
  COMMENT_CREATED = 'comment-created',
}

@UseInterceptors(AuditLogWsInterceptor)
@WebSocketGateway({
    namespace: 'tasks',
    cors: {
        origin: '*',
    },
})
export class TasksGateway {
  @WebSocketServer()
      server: Server;
  constructor (private tasksService: TasksService) {}


  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(TasksEvents.CREATE)
  async createTask (@MessageBody() createTaskDto: CreateTaskDto): Promise<void> {
      const task = await this.tasksService.create(createTaskDto);
      this.broadcast(TasksEvents.UPDATE, task);
      return undefined;
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(TasksEvents.UPDATE)
  async updateTask (@MessageBody() updateTaskDto: UpdateTaskDto): Promise<void> {
      const task = await this.tasksService.update(updateTaskDto.id, updateTaskDto);
      this.broadcast(TasksEvents.UPDATE, task);
      return undefined;
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(TasksEvents.MULTI_REORDERING)
  async multiReordering (@MessageBody() createTaskDto: CreateTaskDto[]): Promise<void> {
      const tasks = await this.tasksService.multiReordering(createTaskDto);
      this.broadcast(TasksEvents.MULTI_REORDERING, tasks);
      return undefined;
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(TasksEvents.DELETE)
  async deleteTask (@MessageBody() id: number): Promise<void> {
      await this.tasksService.delete(id);
      this.broadcast(TasksEvents.DELETE, id);
      return undefined;
  }
  // Broadcasting to all connected clients
  broadcast (event: string, message: any) {
      this.server.emit(event, message);
  }
}
