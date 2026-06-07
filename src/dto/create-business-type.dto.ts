import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBusinessTypeDto {
  @ApiProperty({
    example: 'CP',
    description: 'Mã loại hình kinh doanh (phải là duy nhất)',
  })
  @IsNotEmpty({ message: 'Mã loại hình không được để trống' })
  @IsString({ message: 'Mã loại hình phải là chuỗi ký tự' })
  code: string;

  @ApiProperty({
    example: 'Công ty Cổ phần',
    description: 'Tên loại hình kinh doanh',
  })
  @IsNotEmpty({ message: 'Tên loại hình không được để trống' })
  @IsString({ message: 'Tên loại hình phải là chuỗi ký tự' })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động',
    required: false,
    default: true,
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
