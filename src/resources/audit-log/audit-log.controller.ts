import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';
import { Roles } from '../../common/guards/roles/roles.decorator';
import { Role } from '../../common/guards/roles/role.enum';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Controller('audit-log')
export class AuditLogController {
    constructor (private readonly auditLogService: AuditLogService) {}

    @Roles(Role.Admin)
    @Get()
    findRecent (@Query() query: ListAuditLogsQueryDto): Promise<AuditLog[]> {
        return this.auditLogService.findRecent({ userId: query.userId, resourceType: query.resourceType });
    }
}
