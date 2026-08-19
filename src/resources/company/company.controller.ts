import { Controller, Post, Body, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Company } from './entities/company.entity';
import { SkipAuth } from '../auth/decorators/public.guard';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('company')
export class CompanyController {
    constructor (private readonly companyService: CompanyService) {}
  @SkipAuth()
  @Post()
    create (@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
        return this.companyService.create(createCompanyDto);
    }
  @Patch(':id')
  update (@Param('id', ParseIntPipe) id: number, @Body() updateCompanyDto: UpdateCompanyDto): Promise<Company> {
      return this.companyService.update(id, updateCompanyDto);
  }
}
