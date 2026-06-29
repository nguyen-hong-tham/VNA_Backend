import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsString, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RejectItemDto {
    @ApiProperty({ description: 'ID của báo cáo bị từ chối', example: 1 })
    @IsNotEmpty({ message: 'ID báo cáo không được để trống' })
    @IsInt({ message: 'ID báo cáo phải là số nguyên' })
    reportId: number;

    @ApiProperty({ description: 'Lý do từ chối báo cáo', example: 'Số liệu tai nạn lao động bị sai lệch' })
    @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
    @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
    note: string;
}

export class BulkRejectDto {
    @ApiProperty({
        description: 'Danh sách các báo cáo bị từ chối kèm lý do',
        type: [RejectItemDto],
    })
    @IsNotEmpty({ message: 'Danh sách từ chối không được để trống' })
    @ArrayNotEmpty({ message: 'Danh sách từ chối không được để trống' })
    @IsArray({ message: 'Dữ liệu gửi lên phải là một mảng' })
    @ValidateNested({ each: true })
    @Type(() => RejectItemDto)
    rejectItems: RejectItemDto[];
}