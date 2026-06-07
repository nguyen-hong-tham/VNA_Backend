import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsBoolean({ message: 'Trạng thái phải là giá trị boolean' })
  status?: boolean;
}
