import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { CreateEnterpriseDto } from './create-enterprise.dto';

export class RegisterEnterpriseDto extends CreateEnterpriseDto {}

export class VerifyRegistrationOtpDto {
  @ApiProperty({
    example: '0312345678',
    description: 'Mã số thuế của doanh nghiệp đăng ký',
  })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10,15}$/, {
    message: 'Mã số thuế phải bao gồm từ 10 đến 15 chữ số',
  })
  taxCode: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm 6 chữ số',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã OTP phải có độ dài chính xác 6 ký tự' })
  otp: string;
}

export class ConfirmRegistrationDto {
  @ApiProperty({
    example: '0312345678',
    description: 'Mã số thuế của doanh nghiệp xác nhận đăng ký',
  })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10,15}$/, {
    message: 'Mã số thuế phải bao gồm từ 10 đến 15 chữ số',
  })
  taxCode: string;
}
