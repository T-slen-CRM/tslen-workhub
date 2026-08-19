import { IsIn, IsInt } from 'class-validator';

export class MarkAsReadDto {
    @IsIn([0, 1])
        isRead: number;

    @IsInt()
        id: number;
}
