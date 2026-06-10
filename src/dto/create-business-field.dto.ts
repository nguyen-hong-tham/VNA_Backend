import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBusinessFieldDto {
  @ApiProperty({
    example: '01',
    description: 'Mã ngành nghề kinh doanh (phải là duy nhất)',
  })
  @IsNotEmpty({ message: 'Mã ngành không được để trống' })
  @IsString({ message: 'Mã ngành phải là chuỗi ký tự' })
  code: string;

  @ApiProperty({
    example: 'Nông nghiệp và hoạt động dịch vụ có liên quan',
    description: 'Tên ngành nghề kinh doanh',
  })
  @IsNotEmpty({ message: 'Tên ngành không được để trống' })
  @IsString({ message: 'Tên ngành phải là chuỗi ký tự' })
  name: string;

  @ApiProperty({
    example: 1,
    description: 'ID của nhóm ngành cha trực tiếp (gửi null nếu không có ngành cha)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined) return undefined;
    if (value === null || value === 'null') return null;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber({}, { message: 'ID ngành cha phải là số' })
  parentId?: number | null;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động',
    required: false,
    default: true,
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
