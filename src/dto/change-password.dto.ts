import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'currentpassword123',
    description: 'Mật khẩu hiện tại',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword: string | undefined;

  @ApiProperty({ example: 'newpassword123', description: 'Mật khẩu mới' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`@]).+$/,
    {
      message:
        'Mật khẩu mới phải bao gồm ít nhất 1 chữ viết hoa, 1 chữ viết thường, 1 chữ số và 1 ký tự đặc biệt',
    },
  )
  newPassword: string | undefined;

  @ApiProperty({
    example: 'newpassword123',
    description: 'Xác nhận mật khẩu mới',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập lại mật khẩu mới' })
  @MinLength(6, { message: 'Mật khẩu xác nhận phải có ít nhất 6 ký tự' })
  confirmNewPassword: string | undefined;
}
