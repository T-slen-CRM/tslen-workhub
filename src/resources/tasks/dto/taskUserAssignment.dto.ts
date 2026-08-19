import { IsOptional, IsInt } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { CreateUserDto } from 'src/resources/users/dto/create-user.dto';

export class TaskUserAssignmentDto {

    @IsInt()
        id: number;

    @IsOptional()
    @IsInt()
        taskId: number | null;

    @IsOptional()
    @IsInt()
        userId: number | null;

    @IsOptional()
        task: CreateTaskDto;

    @IsOptional()
        user: CreateUserDto;
}