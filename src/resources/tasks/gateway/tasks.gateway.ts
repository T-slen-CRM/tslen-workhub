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
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { AuditLogWsInterceptor } from '../../../common/interceptors/audit-log-ws.interceptor';
import { AuthGuard } from '../../auth/guards/auth.guard';
export const enum TasksEvents {
  UPDATE = 'update',
  CREATE = 'create',
  MULTI_REORDERING = 'multi-reordering',
  DELETE = 'delete',
  COMMENT_CREATED = 'comment-created',
}

// AuthGuard is registered globally (APP_GUARD in AuthModule), but Nest's
// global guards only reach HTTP controllers, not WebSocket
// @SubscribeMessage handlers - confirmed live (see this gateway's history):
// every WS-originated task change reached the DB with the audit log's
// userId always null, because AuthGuard never ran to set client.user in
// the first place, regardless of what AuditLogWsInterceptor reads.
// Applying it explicitly here makes it run per-message like the HTTP
// case, verifying the JWT the frontend already sends via the socket.io
// handshake's `auth.token` (see TaskWebSocketService) and setting
// client.user before AuditLogWsInterceptor records the change.
@UseGuards(AuthGuard)
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
