import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateEmailDto {
  @ApiProperty({
    example: 'new-email@example.com',
    description: 'Địa chỉ email mới',
  })
  @IsEmail({}, { message: 'Định dạng email mới không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail: string | undefined;

  @ApiProperty({ description: 'Token xác thực đã hoàn thành bước OTP' })
  @IsNotEmpty({ message: 'Token xác thực không được để trống' })
  @IsString({ message: 'Token xác thực phải là một chuỗi ký tự' })
  verificationToken: string | undefined;
}
