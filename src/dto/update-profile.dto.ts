import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString({ message: 'Họ tên phải là chuỗi ký tự' })
  fullName?: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phone?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng YYYY-MM-DD' })
  birthDate?: string;

  @ApiProperty({ example: 'Nam', required: false })
  @IsOptional()
  @IsString({ message: 'Giới tính phải là chuỗi ký tự' })
  gender?: string;

  @ApiProperty({ example: 'Kỹ sư phần mềm', required: false })
  @IsOptional()
  @IsString({ message: 'Chức vụ phải là chuỗi ký tự' })
  position?: string;

  @ApiProperty({ example: 1, required: false, description: 'ID tỉnh/thành phố' })
  @IsOptional()
  @IsNumber()
  provinceId?: number;

  @ApiProperty({ example: 1, required: false, description: 'ID phường/xã' })
  @IsOptional()
  @IsNumber()
  wardId?: number;

  @ApiProperty({ example: '123 Đường Cầu Giấy, Hà Nội', required: false })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  address?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsString({ message: 'Đường dẫn avatar phải là chuỗi ký tự' })
  avatarUrl?: string;
}
