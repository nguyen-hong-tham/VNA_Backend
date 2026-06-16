import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateEnterpriseDto } from './create-enterprise.dto';

export class ConfirmImportDto {
  @ApiProperty({
    type: [CreateEnterpriseDto],
    description:
      'Danh sách các doanh nghiệp hợp lệ được FE gửi lên để lưu vào DB',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEnterpriseDto)
  enterprises: CreateEnterpriseDto[];
}
