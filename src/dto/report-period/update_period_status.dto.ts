import { ApiProperty } from '@nestjs/swagger';
import { PeriodStatus } from '@prisma/client';
import { IsIn, IsNotEmpty } from 'class-validator';
export class UpdatePeriodStatusDto {
    @ApiProperty({
        enum: PeriodStatus,
        example: PeriodStatus.OPEN,
        description: 'Trạng thái mới của kỳ báo cáo (OPEN hoặc CLOSED)',
    })
    @IsNotEmpty({ message: 'Trạng thái không được để trống' })
    @IsIn([PeriodStatus.OPEN, PeriodStatus.CLOSED], {
        message: 'Trạng thái kỳ báo cáo chỉ có thể là OPEN (Hoạt động) hoặc CLOSED (Ngừng hoạt động)',
    })
    status: PeriodStatus;
}