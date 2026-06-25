import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @ApiProperty({
    example: 'Vi phạm nội quy',
    description: 'Tên mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: null,
    description: 'ID danh mục cha',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  parentId?: number;

  @ApiProperty({ example: 1, description: 'Cấp phân cấp', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  level?: number;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hoạt động',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return Boolean(value);
  })
  @IsBoolean()
  status?: boolean;
}
