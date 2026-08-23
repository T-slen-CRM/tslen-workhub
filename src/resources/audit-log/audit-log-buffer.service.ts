import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DeepPartial } from 'typeorm';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './entities/audit-log.entity';

export const AUDIT_LOG_BUFFER_CAPACITY = 5000;
export const AUDIT_LOG_FLUSH_INTERVAL_MS = 60_000;

@Injectable()
export class AuditLogBufferService {
    private readonly logger = new Logger(AuditLogBufferService.name);
    private buffer: DeepPartial<AuditLog>[] = [];
    private droppedCount = 0;

    constructor (private readonly auditLogRepository: AuditLogRepository) {}

    enqueue (entry: DeepPartial<AuditLog>): void {
        if (this.buffer.length >= AUDIT_LOG_BUFFER_CAPACITY) {
            this.droppedCount += 1;
            return;
        }
        this.buffer.push(entry);
    }

    @Interval(AUDIT_LOG_FLUSH_INTERVAL_MS)
    async flush (): Promise<void> {
        const entriesToWrite = this.buffer;
        const dropped = this.droppedCount;
        this.buffer = [];
        this.droppedCount = 0;

        if (dropped > 0) {
            this.logger.warn(`Dropped ${dropped} audit log entries: buffer at capacity`);
        }
        if (entriesToWrite.length === 0) {
            return;
        }
        try {
            await this.auditLogRepository.insertMany(entriesToWrite);
        } catch (e) {
            this.logger.error(`Failed to flush audit log buffer: ${e.message}`);
        }
    }
}
