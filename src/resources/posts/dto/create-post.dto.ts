import { IsNumber, IsOptional, IsString } from 'class-validator';


export class CreatePostDto {
    @IsNumber()
        userId : number;

    @IsNumber()
        companyId: number;

    @IsString()
        title: string;

    @IsOptional()
        subtitle: string;

    @IsString()
        createdAt: Date;

    @IsOptional()
    @IsString()
        text: string | null;

    @IsNumber()
        likes: number;

    @IsOptional()
        image: string;

    @IsString()
        likesOwners: string;

    @IsOptional()
    @IsString()
        avatar: string;

    @IsOptional()
    @IsNumber()
        id: number;
}
