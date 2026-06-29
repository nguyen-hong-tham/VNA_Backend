import { Optional } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PeriodType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class QueryDepartmentReportDto {
    @ApiPropertyOptional({
        description: 'Trang hiện tại cần lấy dữ liệu',
        default: 1,
        example: 1,
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10) || 1)
    @IsInt()
    @Min(1)
    current?: number;

    @ApiPropertyOptional({
        description: 'Số lượng bản ghi trên một trang (mặc định là 10)',
        default: 10,
        example: 10,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value, 10) || 10)
    limit?: number;

    @ApiPropertyOptional({
        description: 'Mã số định danh Tỉnh/Thành phố (lấy theo ID hành chính)',
        example: 79,
    })
    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    provinceId?: number;



    @ApiPropertyOptional({
        description: 'Mã số định danh Phường/Xã (lấy theo ID hành chính)',
        example: 27424,
    })
    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    wardId?: number;

    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm theo tên doanh nghiệp',
        example: 'Công ty ABC',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    enterpriseName?: string;

    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm theo mã số thuế',
        example: '0317118106',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    taxCode?: string;

    @ApiPropertyOptional({
        description: 'Năm báo cáo',
        example: 2026,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(2000)
    @Transform(({ value }) => parseInt(value, 10))
    year?: number;

    @ApiPropertyOptional({
        description: 'Lọc theo kỳ báo cáo (6 tháng hoặc Cả năm)',
        enum: PeriodType,
        example: PeriodType.YEAR,
    })
    @IsOptional()
    @IsEnum(PeriodType)
    periodType?: PeriodType;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái báo cáo (REPORTING: Đang báo cáo, SUBMITTED: Chờ tiếp nhận, APPROVED: Đã tiếp nhận, REJECTED: Bị từ chối)',
        enum: ['REPORTING', 'APPROVED', 'SUBMITTED', 'REJECTED'],
        example: 'APPROVED',
    })
    @IsOptional()
    @IsIn(['REPORTING', 'APPROVED', 'SUBMITTED', 'REJECTED'], {
        message: 'Trạng thái báo cáo không hợp lệ',
    })
    status?: 'REPORTING' | 'APPROVED' | 'SUBMITTED' | 'REJECTED';
}
