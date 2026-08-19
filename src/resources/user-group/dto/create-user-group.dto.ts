import { IsNumber, IsOptional, IsString } from "class-validator";
import { CreateCompanyDto } from '../../company/dto/create-company.dto';
import { UserRelationToGroupDto } from "src/resources/users/dto/userRelationToGroup.dto";


export class CreateUserGroupDto {

   @IsOptional()
   @IsNumber()
       id: number;

   @IsString()
       name: string;

   @IsOptional()
       createdAt: Date;

   @IsString()
       permissions: string | null;

   @IsNumber()
       companyId: number | null;

   @IsOptional()
       userRelationToGroups: UserRelationToGroupDto[];

   @IsOptional()
       company: CreateCompanyDto;

}
