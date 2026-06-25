import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'ACCIDENT_CAUSE',
    description:
      'Loại danh mục: ACCIDENT_CAUSE | INJURY_FACTOR | OCCUPATION | INJURY_TYPE. Có thể bỏ qua nếu đã truyền qua query param ?type=...',
    enum: CategoryType,
    required: false,
  })
  @IsOptional()
  @IsEnum(CategoryType, { message: 'Loại danh mục không hợp lệ' })
  type?: CategoryType;

  @ApiProperty({
    example: 'A01',
    description: 'Mã danh mục (duy nhất trong cùng loại)',
  })
  @IsNotEmpty({ message: 'Mã danh mục không được để trống' })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Vi phạm quy chuẩn an toàn',
    description: 'Tên danh mục',
  })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: null,
    description: 'ID danh mục cha (để trống nếu là cấp 1)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'parentId phải là số' })
  @Min(1)
  parentId?: number;

  @ApiProperty({
    example: 1,
    description: 'Cấp phân cấp (1 = cấp cha, 2 = con, ...)',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  level?: number;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động',
    required: false,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return Boolean(value);
  })
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  status?: boolean;
}
