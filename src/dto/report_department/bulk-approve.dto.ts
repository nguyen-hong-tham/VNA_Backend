import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, ArrayNotEmpty } from 'class-validator';

export class BulkApproveDto {
    @ApiProperty({
        description: 'Danh sách ID của các báo cáo cần duyệt',
        example: [1, 2, 3],
    })
    @IsNotEmpty({ message: 'Danh sách ID báo cáo không được để trống' })
    @ArrayNotEmpty({ message: 'Danh sách ID báo cáo không được để trống' })
    @IsArray({ message: 'reportIds phải là một mảng số nguyên' })
    @IsInt({ each: true, message: 'ID báo cáo phải là số nguyên' })
    reportIds: number[];
}