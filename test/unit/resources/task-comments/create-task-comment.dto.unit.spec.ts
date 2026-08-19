import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskCommentDto } from '../../../../src/resources/task-comments/dto/create-task-comment.dto';

describe('CreateTaskCommentDto', () => {
    it('rejects empty content', async () => {
        const dto = plainToInstance(CreateTaskCommentDto, { taskId: 1, content: '' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'content')).toBe(true);
    });

    it('accepts a valid payload', async () => {
        const dto = plainToInstance(CreateTaskCommentDto, { taskId: 1, content: 'looks good' });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
    });
});
