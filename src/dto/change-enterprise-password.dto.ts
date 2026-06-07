import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeEnterprisePasswordDto {
  @ApiProperty({
    example: '0312345678',
    description: 'Tên đăng nhập (chính là mã số thuế của doanh nghiệp)',
  })
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự' })
  username: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
  })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @MinLength(8, { message: 'Mật khẩu mới phải từ 8 ký tự trở lên' })
  newPassword: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Xác nhận lại mật khẩu mới',
  })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  @IsString({ message: 'Xác nhận mật khẩu phải là chuỗi ký tự' })
  confirmPassword: string;
}
