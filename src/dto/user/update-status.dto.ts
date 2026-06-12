import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto {
  @ApiProperty({ example: false, description: 'Trạng thái kích hoạt tài khoản' })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsNotEmpty({ message: 'Trạng thái hoạt động không được để trống' })
  isActive: boolean;
}
