import { AuditLogBufferService, AUDIT_LOG_BUFFER_CAPACITY } from '../../../../src/resources/audit-log/audit-log-buffer.service';
import { AuditLogRepository } from '../../../../src/resources/audit-log/audit-log.repository';

describe('AuditLogBufferService', () => {
    function buildService (insertMany: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
        const repository = { insertMany } as unknown as AuditLogRepository;
        return { service: new AuditLogBufferService(repository), insertMany };
    }

    it('flush is a no-op when the buffer is empty', async () => {
        const { service, insertMany } = buildService();

        await service.flush();

        expect(insertMany).not.toHaveBeenCalled();
    });

    it('flush writes every enqueued entry in a single batched call', async () => {
        const { service, insertMany } = buildService();

        service.enqueue({ ip: '1.1.1.1', method: 'POST' });
        service.enqueue({ ip: '2.2.2.2', method: 'DELETE' });
        await service.flush();

        expect(insertMany).toHaveBeenCalledTimes(1);
        expect(insertMany).toHaveBeenCalledWith([
            { ip: '1.1.1.1', method: 'POST' },
            { ip: '2.2.2.2', method: 'DELETE' },
        ]);
    });

    it('clears the buffer after a flush, so entries are not written twice', async () => {
        const { service, insertMany } = buildService();
        service.enqueue({ ip: '1.1.1.1', method: 'POST' });

        await service.flush();
        await service.flush();

        expect(insertMany).toHaveBeenCalledTimes(1);
    });

    it('drops entries past capacity instead of growing the buffer unboundedly', async () => {
        const { service, insertMany } = buildService();

        for (let i = 0; i < AUDIT_LOG_BUFFER_CAPACITY + 5; i++) {
            service.enqueue({ ip: `1.1.1.${i}`, method: 'POST' });
        }
        await service.flush();

        expect(insertMany).toHaveBeenCalledTimes(1);
        expect(insertMany.mock.calls[0][0]).toHaveLength(AUDIT_LOG_BUFFER_CAPACITY);
    });

    it('swallows a repository failure during flush instead of throwing', async () => {
        const { service } = buildService(jest.fn().mockRejectedValue(new Error('db down')));
        service.enqueue({ ip: '1.1.1.1', method: 'POST' });

        await expect(service.flush()).resolves.toBeUndefined();
    });
});
