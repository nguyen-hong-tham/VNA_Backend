import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordAdminDto {
  @ApiProperty({ example: '12345678a', description: 'Mật khẩu mới khởi tạo' })
  @IsString({ message: 'Mật khẩu phải là một chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải dài tối thiểu 8 ký tự' })
  newPassword: string;
}
