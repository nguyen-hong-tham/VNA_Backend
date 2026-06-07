import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessTypeDto {
  @ApiProperty({
    example: 'Công ty Cổ phần',
    description: 'Tên loại hình kinh doanh',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Tên loại hình phải là chuỗi ký tự' })
  name?: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái phải là giá trị boolean' })
  status?: boolean;
}
