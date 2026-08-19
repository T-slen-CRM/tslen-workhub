import { IsOptional, IsInt, IsString, IsNumber } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class TaskAttachmentsDto{

  @IsOptional()
  @IsNumber()
      id: number;

  @IsOptional()
  @IsInt()
      taskId: number | null;

  @IsString()
      type: string | null;

  @IsOptional()
  @IsString()
      name: string;

  @IsString()
      url: string;

  @IsString()
      originName: string;

  @IsOptional()
  @IsString()
      extension: string | null;

  @IsOptional()
      task: CreateTaskDto;
}