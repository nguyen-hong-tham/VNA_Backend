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

    const date = new Date(Date.UTC(year, month - 1, day));

    // kiểm tra tính hợp lệ của ngày thực tế 
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return new Date('invalid'); // Ngày không hợp lệ
    }
    return date;
}

export class QueryReportPeriodDto {
    // tìm kiếm theo tên báo cáo
    @ApiPropertyOptional({
        example: 'Báo cáo tai nạn lao động',
        description: 'Tên kỳ báo cáo',
    })
    @IsOptional()
    @IsString()
    search?: string;

    // loc theo nam
    @ApiPropertyOptional({ description: 'Lọc theo năm báo cáo' })
    @IsOptional()
    @IsInt()
    @Min(2000)
    @Transform(({ value }) => parseInt(value, 10))
    year?: number;

    // loc theo loai ky bao cao
    @ApiPropertyOptional({ description: 'Lọc theo loại kỳ báo cáo (HALF_YEAR hoặc YEAR)' })
    @IsOptional()
    @IsEnum(PeriodType)
    periodType?: PeriodType;

    // loc theo thoi gian bat dau
    @ApiPropertyOptional({ type: String, example: '01/01/2026', description: 'Lọc từ ngày bắt đầu kỳ (Định dạng DD/MM/YYYY)' })
    @IsOptional()
    @Transform(transformStringToDate)
    @IsDate({ message: 'Ngày bắt đầu lọc không đúng định dạng hoặc không hợp lệ (DD/MM/YYYY)' })
    startDate?: Date;

    // loc theo thoi gian ket thuc
    @ApiPropertyOptional({ type: String, example: '31/12/2026', description: 'Lọc đến ngày kết thúc kỳ (Định dạng DD/MM/YYYY)' })
    @IsOptional()
    @Transform(transformStringToDate)
    @IsDate({ message: 'Ngày kết thúc lọc không đúng định dạng hoặc không hợp lệ (DD/MM/YYYY)' })
    endDate?: Date;

    // loc theo trang thai bao cao
    @ApiPropertyOptional({ description: 'Lọc theo trạng thái báo cáo (OPEN: Hoạt động, CLOSED: Ngừng hoạt động)' })
    @IsOptional()
    @IsIn([PeriodStatus.OPEN, PeriodStatus.CLOSED], {
        message: 'Trạng thái kỳ báo cáo chỉ có thể là OPEN (Hoạt động) hoặc CLOSED (Ngừng hoạt động)',
    })
    status?: PeriodStatus;

    // phân trang
    @ApiPropertyOptional({ description: 'trang hiện tại (mặc định: 1)', default: 1 })
    @IsOptional()
    @IsInt()
    @Transform(({ value }) => parseInt(value, 10))
    current?: number;

    // số lượng data mỗi trang
    @ApiPropertyOptional({ description: 'Số bản ghi mỗi trang (mặc định: 10)', default: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value, 10))
    limit?: number;
}