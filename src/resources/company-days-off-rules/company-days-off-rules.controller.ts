import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { CompanyDaysOffRulesService } from './company-days-off-rules.service';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { CompanyDaysOffRules } from './entities/company-days-off-rules.entity';
import { UpdateCompanyDaysOffRuleDto } from './dto/update-company-days-off-rule.dto';
@Controller('company-days-off-rules')
export class CompanyDaysOffRulesController {
    constructor (private companyDaysOffRulesService: CompanyDaysOffRulesService) {}
  @Get()
    async findOneById (@User() user: Users): Promise<CompanyDaysOffRules> {
        return await this.companyDaysOffRulesService.findOneById(user.companyId, user);
    }
  @Patch(':id')
  async update (
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompanyDaysOffRuleDto: UpdateCompanyDaysOffRuleDto): Promise<CompanyDaysOffRules> {
      return await this.companyDaysOffRulesService.update(id, updateCompanyDaysOffRuleDto);
  }

}
