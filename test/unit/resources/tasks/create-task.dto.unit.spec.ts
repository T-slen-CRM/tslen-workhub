import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from '../../../../src/resources/tasks/dto/create-task.dto';

describe('CreateTaskDto', () => {
    it('accepts a payload with no actorUserId', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'actorUserId')).toBe(false);
    });

    it('accepts a payload with an integer actorUserId', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test', priority: 'medium', actorUserId: 7 });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.actorUserId).toBe(7);
    });

    it('rejects a non-integer actorUserId', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test', actorUserId: 'not-a-number' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'actorUserId')).toBe(true);
    });

    it('accepts a valid priority', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test', priority: 'high' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'priority')).toBe(false);
    });

    it('rejects a priority outside low/medium/high', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test', priority: 'urgent' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'priority')).toBe(true);
    });

    // tasks.priority is NOT NULL in Postgres (see task.entity.ts), so a
    // payload with no priority was always going to fail - either here, with
    // a clear message, or downstream as a confusing DB constraint
    // violation ("null value in column priority violates not-null
    // constraint"). Reject it at the DTO layer instead.
    it('rejects a payload with no priority at all', async () => {
        const dto = plainToInstance(CreateTaskDto, { title: 'test' });

        const errors = await validate(dto);

        expect(errors.some((e) => e.property === 'priority')).toBe(true);
    });
});
