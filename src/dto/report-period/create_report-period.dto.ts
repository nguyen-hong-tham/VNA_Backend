import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PeriodStatus, PeriodType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
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

export class CreateReportPeriodDto {
    // Tên kỳ báo cáo 
    @ApiProperty({
        example: 'Báo cáo tai nạn lao động',
        description: 'Tên kỳ báo cáo',
    })
    @IsNotEmpty({ message: 'Tên kỳ báo cáo không được để trống' })
    @IsString({ message: 'Tên kỳ báo cáo phải là chuỗi ký tự' })
    @MinLength(3, { message: 'Tên kỳ báo cáo phải có tối thiểu 3 ký tự' })
    @MaxLength(255, { message: 'Tên kỳ báo cáo tối đa 255 ký tự' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    reportName: string;

    // Năm báo cáo 
    @ApiProperty({ example: 2026, description: 'Năm báo cáo' })
    @IsNotEmpty({ message: 'Năm báo cáo không được để trống' })
    @IsInt({ message: 'Năm báo cáo phải là số nguyên' })
    @Min(2000, { message: 'Năm báo cáo không được trước năm 2000' })
    @Transform(({ value }) => parseInt(value, 10))
    year: number;

    // Loại kỳ báo cáo 
    @ApiProperty({
        enum: PeriodType,
        example: PeriodType.YEAR,
        description: 'Kỳ báo cáo (HALF_YEAR hoặc YEAR)',
    })
    @IsNotEmpty({ message: 'Loại kỳ báo cáo không được để trống' })
    @IsEnum(PeriodType, { message: 'Loại kỳ báo cáo không hợp lệ' })
    periodType: PeriodType;

    // Ngày bắt đầu kỳ 
    @ApiProperty({ example: '01/01/2026', description: 'Ngày bắt đầu kỳ (Định dạng DD/MM/YYYY)' })
    @IsNotEmpty({ message: 'Ngày bắt đầu không được để trống' })
    @Transform(transformStringToDate)
    @IsDate({ message: 'Ngày bắt đầu không đúng định dạng Date hoặc không hợp lệ (Yêu cầu: DD/MM/YYYY)' })
    startDate: Date;

    // Ngày kết thúc kỳ 
    @ApiProperty({ example: '31/12/2026', description: 'Ngày kết thúc kỳ (Định dạng DD/MM/YYYY)' })
    @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
    @Transform(transformStringToDate)
    @IsDate({ message: 'Ngày kết thúc không đúng định dạng Date hoặc không hợp lệ (Yêu cầu: DD/MM/YYYY)' })
    endDate: Date;

    // Trạng thái kỳ báo cáo 
    // open: Hoạt động (đang mở)
    // closed: Ngừng hoạt động (đã đóng)
    @ApiPropertyOptional({
        enum: PeriodStatus,
        example: PeriodStatus.OPEN,
        description: 'Trạng thái kỳ báo cáo (OPEN, CLOSED)',
        default: PeriodStatus.OPEN,
    })
    @IsOptional()
    @IsIn([PeriodStatus.OPEN, PeriodStatus.CLOSED], {
        message: 'Trạng thái kỳ báo cáo chỉ có thể là OPEN (Hoạt động) hoặc CLOSED (Ngừng hoạt động)',
    })
    status?: PeriodStatus;
}