import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => {
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean({ message: 'Trạng thái phải là giá trị boolean' })
  status?: boolean;
}
