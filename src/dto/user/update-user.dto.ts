import { IsString, IsEmail, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'Phan Thanh Tùng' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @MaxLength(255, { message: 'Họ và tên tối đa 255 ký tự' })
  fullName: string;

  @ApiProperty({ example: 'phanthanhtung093@gmail.com' })
  @IsEmail({}, { message: 'Định dạng Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @MaxLength(255, { message: 'Email tối đa 255 ký tự' })
  email: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsNumber({}, { message: 'Vai trò phải là một số (ID)' })
  roleId: number;

  @ApiProperty({ example: 'Chuyên viên', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Chức danh tối đa 255 ký tự' })
  position?: string;

  @ApiProperty({ example: '01/06/1995', required: false })
  @IsOptional()
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'Ngày sinh phải đúng định dạng DD/MM/YYYY',
  })
  birthDate?: string;

  @ApiProperty({ example: 'Nam', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Giới tính tối đa 20 ký tự' })
  gender?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  provinceId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  wardId?: number;

  @ApiProperty({ example: '123 Đường Nguyễn Huệ', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Địa chỉ tối đa 1000 ký tự' })
  address?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'URL ảnh đại diện tối đa 500 ký tự' })
  avatarUrl?: string;
}