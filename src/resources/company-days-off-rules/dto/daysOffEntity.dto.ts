import { IsNumber, IsOptional } from "class-validator";
import { CreateUserDto } from "../../users/dto/create-user.dto";

export class DaysOffEntityDto {

    @IsNumber()
        id: number;

    @IsOptional()
    @IsNumber()
        userId: number | null;

    @IsNumber()
        companyId: number;

    @IsNumber()
        hospital: number;

    @IsNumber()
        timeOff: number;

    @IsNumber()
        vocation: number;

    @IsNumber()
        transfer: number;

    @IsNumber()
        home: number;

    @IsOptional()
        user: CreateUserDto;
}