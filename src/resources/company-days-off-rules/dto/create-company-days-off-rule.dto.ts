import { IsNumber, IsOptional } from "class-validator";

export class CreateCompanyDaysOffRuleDto  {

    @IsOptional()
    @IsNumber()
        companyId: number;

    @IsOptional()
    @IsNumber()
        hospital: number | null;

    @IsOptional()
    @IsNumber()
        timeOff: number | null;

    @IsOptional()
    @IsNumber()
        vocation: number | null;

    @IsOptional()
    @IsNumber()
        transfer: number | null;

    @IsOptional()
    @IsNumber()
        home: number | null;

    @IsOptional()
    @IsNumber()
        useScheduler: number | null;
}
