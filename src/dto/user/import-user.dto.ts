import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportUserItemDto {
    @ApiProperty({ description: 'Tên tài khoản đăng nhập (chỉ chữ thường, số, gạch dưới)' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ description: 'Họ và tên cán bộ' })
    @IsNotEmpty()
    @IsString()
    fullName: string;

    @ApiProperty({ description: 'Email của cán bộ' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'ID vai trò hệ thống (Role)' })
    @IsNotEmpty()
    roleId: number;

    @ApiProperty({ description: 'Chức danh/Chức vụ', required: false })
    @IsOptional()
    @IsString()
    position?: string;

    @ApiProperty({ description: 'Ngày sinh định dạng DD/MM/YYYY', required: false })
    @IsOptional()
    @IsString()
    birthDate?: string;

    @ApiProperty({ description: 'Giới tính', required: false })
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiProperty({ description: 'Địa chỉ', required: false })
    @IsOptional()
    @IsString()
    address?: string;
}

export class ConfirmImportUserDto {
    @ApiProperty({ type: [ImportUserItemDto], description: 'Danh sách cán bộ hợp lệ được xác nhận lưu' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportUserItemDto)
    users: ImportUserItemDto[];
}