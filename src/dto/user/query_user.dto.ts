import { Type, Transform } from 'class-transformer';
import {
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    IsNotEmpty,
    IsInt,
    Min,
} from 'class-validator';

export class QueryUserDto {
    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    position?: string;


    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    roleId?: number;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value == 'true') return true;
        if (value == 'false') return false;
        return undefined;
    })
    isActive?: boolean;



    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;




}