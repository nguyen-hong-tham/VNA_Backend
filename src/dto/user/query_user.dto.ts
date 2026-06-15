import { Type, Transform } from 'class-transformer';
import {
    IsBoolean,
    IsOptional,
    IsString,
    IsInt,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUserDto {
    @ApiPropertyOptional({ description: 'Tìm kiếm gần đúng theo họ và tên (không phân biệt chữ hoa thường)' })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional({ description: 'Tìm kiếm gần đúng theo tên đăng nhập (không phân biệt chữ hoa thường)' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ description: 'Tìm kiếm gần đúng theo email (không phân biệt chữ hoa thường)' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ description: 'Tìm kiếm gần đúng theo chức danh (không phân biệt chữ hoa thường)' })
    @IsOptional()
    @IsString()
    position?: string;

    @ApiPropertyOptional({ description: 'Lọc chính xác theo ID của vai trò (Role ID)' })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    roleId?: number;

    @ApiPropertyOptional({ description: 'Lọc chính xác theo trạng thái kích hoạt (true/false)' })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => {
        if (value == 'true') return true;
        if (value == 'false') return false;
        return undefined;
    })
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Số trang kết quả', default: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Số lượng cán bộ tối đa trên mỗi trang', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}