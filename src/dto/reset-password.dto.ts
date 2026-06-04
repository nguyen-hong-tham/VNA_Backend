import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của tài khoản cần khôi phục mật khẩu',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail(
    {},
    {
      message: 'Vui lòng nhập đúng định dạng email.',
    },
  )
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP gồm 6 ký tự chữ số được gửi tới email của người dùng',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là một chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã OTP phải có độ dài đúng 6 ký tự' })
  otp!: string;

  @ApiProperty({
    example: 'MatKhauMoi123!',
    description: 'Mật khẩu mới cần thiết lập',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  newPassword!: string;

  @ApiProperty({
    example: 'MatKhauMoi123!',
    description: 'Nhập lại mật khẩu mới để xác nhận',
  })
  @IsNotEmpty({ message: 'Mật khẩu xác nhận không được để trống' })
  confirmNewPassword!: string;
}
