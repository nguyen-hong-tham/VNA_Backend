import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBusinessFieldDto {
  @ApiProperty({
    example: 'Nông nghiệp và hoạt động dịch vụ có liên quan',
    description: 'Tên ngành nghề kinh doanh',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Tên ngành phải là chuỗi ký tự' })
  name?: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean({ message: 'Trạng thái phải là giá trị boolean' })
  status?: boolean;
}
