import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

export class VerifyEmailChangeDto {
  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm 6 chữ số',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  otp: string | undefined;
}
