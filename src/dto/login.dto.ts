import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'username123',
    description: 'Tên đăng nhập',
  })
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin' })
  username: string | undefined;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu đăng nhập' })
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin' })
  password: string | undefined;

  @ApiProperty({
    example: true,
    description: 'Lưu trạng thái đăng nhập (Ghi nhớ mật khẩu)',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'rememberMe phải là giá trị boolean' })
  rememberMe?: boolean;
}

