import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

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
}
