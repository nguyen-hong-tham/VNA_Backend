import { ApiPropertyOptional } from '@nestjs/swagger';
import { PeriodStatus, PeriodType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    MinLength,
    MaxLength,
    IsDate,
    IsIn,
} from 'class-validator';

// hàm helper chuyển đổi dạng đ/mm/yy thành đối tương date
const transformStringToDate = ({ value }: { value: any }) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    const parts = String(value).trim().split('/');
    if (parts.length !== 3) {
        return new Date('invalid'); // Trả về đối tượng Date không hợp lệ để class-validator phát hiện
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month - 1, day);

    // kiểm tra tính hợp lệ của ngày thực tế 
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return new Date('invalid'); // Ngày không hợp lệ
    }
    return date;
}

export class UpdateReportPeriodDto {
    // Tên kỳ báo cáo 
    @ApiPropertyOptional({
        example: 'Báo cáo tai nạn lao động',
        description: 'Tên kỳ báo cáo',
    })
    @IsOptional()
    @IsString({ message: 'Tên kỳ báo cáo phải là chuỗi ký tự' })
    @MinLength(3, { message: 'Tên kỳ báo cáo phải có tối thiểu 3 ký tự' })
    @MaxLength(255, { message: 'Tên kỳ báo cáo tối đa 255 ký tự' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    reportName?: string;

    // Năm báo cáo 
    @ApiPropertyOptional({ example: 2026, description: 'Năm báo cáo' })
    @IsOptional()
    @IsInt({ message: 'Năm báo cáo phải là số nguyên' })
    @Min(2000, { message: 'Năm báo cáo không được trước năm 2000' })
    @Transform(({ value }) => parseInt(value, 10))
    year?: number;

    // Loại kỳ báo cáo 
    @ApiPropertyOptional({
        enum: PeriodType,
        example: PeriodType.YEAR,
        description: 'Kỳ báo cáo (HALF_YEAR hoặc YEAR)',
    })
    @IsOptional()
    @IsEnum(PeriodType, { message: 'Loại kỳ báo cáo không hợp lệ' })
    periodType?: PeriodType;

    // Ngày bắt đầu kỳ 
    @ApiPropertyOptional({ example: '01/01/2026', description: 'Ngày bắt đầu kỳ (Định dạng DD/MM/YYYY)' })
    @IsOptional()
    @Transform(transformStringToDate)
    @IsDate({ message: 'Ngày bắt đầu không đúng định dạng Date hoặc không hợp lệ (Yêu cầu: DD/MM/YYYY)' })
    startDate?: Date;

    // Ngày kết thúc kỳ 
    @ApiPropertyOptional({ example: '31/12/2026', description: 'Ngày kết thúc kỳ (Định dạng DD/MM/YYYY)' })
    @IsOptional()
    @Transform(transformStringToDate)
    @IsDate({ message: 'Ngày kết thúc không đúng định dạng Date hoặc không hợp lệ (Yêu cầu: DD/MM/YYYY)' })
    endDate?: Date;

    // Trạng thái kỳ báo cáo 
    @ApiPropertyOptional({
        enum: PeriodStatus,
        example: PeriodStatus.OPEN,
        description: 'Trạng thái kỳ báo cáo (OPEN: Hoạt động, CLOSED: Ngừng hoạt động)',
    })
    @IsOptional()
    @IsIn([PeriodStatus.OPEN, PeriodStatus.CLOSED], {
        message: 'Trạng thái kỳ báo cáo chỉ có thể là OPEN (Hoạt động) hoặc CLOSED (Ngừng hoạt động)',
    })
    status?: PeriodStatus;
}
