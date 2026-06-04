import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đã đăng ký trên hệ thống để khôi phục mật khẩu',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail(
    {},
    {
      message: 'Vui lòng nhập đúng định dạng email.',
    },
  )
  email!: string;
}
