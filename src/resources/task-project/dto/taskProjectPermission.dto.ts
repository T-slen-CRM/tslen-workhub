import { IsEnum, IsInt, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTaskProjectDto } from './create-task-project.dto';
import { CreateUserDto } from 'src/resources/users/dto/create-user.dto';

export class TaskProjectPermissionDto {

  @IsOptional()
      id: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
      projectId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
      userId: number;

  @IsOptional()
  @IsEnum(['read', 'write', 'admin'])
      permission: 'read' | 'write' | 'admin';


  @IsOptional()
      project: CreateTaskProjectDto;

  @IsOptional()
      user: CreateUserDto;
}
