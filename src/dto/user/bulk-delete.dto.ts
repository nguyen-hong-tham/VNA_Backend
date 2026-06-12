import { IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Danh sách ID người dùng cần xóa' })
  @IsArray({ message: 'Danh sách ID phải là một mảng' })
  @IsInt({ each: true, message: 'ID người dùng phải là số nguyên' })
  @IsNotEmpty({ message: 'Danh sách ID không được để trống' })
  ids: number[];
}
