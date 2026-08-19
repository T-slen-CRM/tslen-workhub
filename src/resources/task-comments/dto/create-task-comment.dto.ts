import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTaskCommentDto {
    @IsNumber()
        taskId: number;

    @IsString()
    @IsNotEmpty()
        content: string;
}
