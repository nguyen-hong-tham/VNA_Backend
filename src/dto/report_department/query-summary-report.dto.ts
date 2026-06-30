import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PeriodType } from '@prisma/client';

export class QuerySummaryReportDto {
    @ApiProperty({
        description: 'Năm cần tổng hợp dữ liệu',
        example: 2026,
    })
    @IsNotEmpty({ message: 'Vui lòng chọn năm báo cáo' })
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    year: number;

    @ApiProperty({
        description: 'Mã số định danh Tỉnh/Thành phố',
        example: 79,
    })
    @IsNotEmpty({ message: 'Vui lòng chọn tỉnh/thành phố' })
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    provinceId: number;

    @ApiPropertyOptional({
        description: 'Kỳ báo cáo (HALF_YEAR: 6 tháng, YEAR: Cả năm). Mặc định là YEAR.',
        enum: PeriodType,
        example: PeriodType.YEAR,
    })
    @IsOptional()
    @IsEnum(PeriodType, { message: 'Kỳ báo cáo không hợp lệ' })
    periodType?: PeriodType = PeriodType.YEAR;
}

