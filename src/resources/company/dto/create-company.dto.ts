import { IsOptional } from 'class-validator';

export class CreateCompanyDto {
  @IsOptional()
      id: number;
  name: string;
  country: string;
  companyDaysOffRules: any[];
  daysOffSchedulers: any[];
  usersGroups: any[];
}
