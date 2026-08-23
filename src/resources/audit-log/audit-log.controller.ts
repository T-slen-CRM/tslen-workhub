import { Controller, Get } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';
import { Roles } from '../../common/guards/roles/roles.decorator';
import { Role } from '../../common/guards/roles/role.enum';

@Controller('audit-log')
export class AuditLogController {
    constructor (private readonly auditLogService: AuditLogService) {}

    @Roles(Role.Admin)
    @Get()
    findRecent (): Promise<AuditLog[]> {
        return this.auditLogService.findRecent();
    }
}
