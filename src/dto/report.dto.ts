import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

// Accident Case DTO
export class ReportAccidentCaseDto {
  @ApiPropertyOptional({ description: 'ID danh mục nguyên nhân tai nạn (ACCIDENT_CAUSE)' })
  @IsOptional()
  @IsInt()
  accidentCauseId?: number;

  @ApiPropertyOptional({ description: 'ID danh mục yếu tố gây thương tích (INJURY_FACTOR)' })
  @IsOptional()
  @IsInt()
  injuryFactorId?: number;

  @ApiPropertyOptional({ description: 'ID danh mục nghề nghiệp (OCCUPATION)' })
  @IsOptional()
  @IsInt()
  occupationId?: number;

  @ApiPropertyOptional({ description: 'Số vụ tai nạn', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  accidentCount?: number;

  @ApiPropertyOptional({ description: 'Số vụ tai nạn chết người', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fatalAccidentCount?: number;

  @ApiPropertyOptional({ description: 'Số vụ tai nạn có 2 người bị nạn trở lên', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  multiVictimAccidentCount?: number;

  @ApiPropertyOptional({ description: 'Tổng số người bị nạn', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  victimCount?: number;

  @ApiPropertyOptional({ description: 'Số người bị nạn do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseVictimCount?: number;

  @ApiPropertyOptional({ description: 'Số lao động nữ bị nạn', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  femaleVictimCount?: number;

  @ApiPropertyOptional({ description: 'Số lao động nữ bị nạn do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseFemaleVictimCount?: number;

  @ApiPropertyOptional({ description: 'Số người chết', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deathCount?: number;

  @ApiPropertyOptional({ description: 'Số người chết do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseDeathCount?: number;

  @ApiPropertyOptional({ description: 'Số người bị thương nặng', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  severelyInjuredCount?: number;

  @ApiPropertyOptional({ description: 'Số người bị thương nặng do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseSeverelyInjuredCount?: number;

  @ApiPropertyOptional({ description: 'Chi phí y tế (đồng)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  medicalCost?: number;

  @ApiPropertyOptional({ description: 'Tiền lương trả cho người bị nạn trong thời gian điều trị', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryCompensation?: number;

  @ApiPropertyOptional({ description: 'Tiền bồi thường, trợ cấp cho người bị nạn', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compensationCost?: number;

  @ApiPropertyOptional({ description: 'Thiệt hại tài sản (đồng)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  assetDamage?: number;

  @ApiPropertyOptional({ description: 'Tổng số ngày công nghỉ việc', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysLost?: number;
}

// Section DTO
export class ReportSectionUpdateDto {
  @ApiPropertyOptional({ description: 'Số vụ tai nạn', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  accidentCount?: number;

  @ApiPropertyOptional({ description: 'Số vụ tai nạn chết người', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fatalAccidentCount?: number;

  @ApiPropertyOptional({ description: 'Số vụ tai nạn có 2 người bị nạn trở lên', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  multiVictimAccidentCount?: number;

  @ApiPropertyOptional({ description: 'Tổng số người bị nạn', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  victimCount?: number;

  @ApiPropertyOptional({ description: 'Số người bị nạn do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseVictimCount?: number;

  @ApiPropertyOptional({ description: 'Số lao động nữ bị nạn', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  femaleVictimCount?: number;

  @ApiPropertyOptional({ description: 'Số lao động nữ bị nạn do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseFemaleVictimCount?: number;

  @ApiPropertyOptional({ description: 'Số người chết', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deathCount?: number;

  @ApiPropertyOptional({ description: 'Số người chết do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseDeathCount?: number;

  @ApiPropertyOptional({ description: 'Số người bị thương nặng', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  severelyInjuredCount?: number;

  @ApiPropertyOptional({ description: 'Số người bị thương nặng do lỗi của người SDLĐ', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unmanagedCauseSeverelyInjuredCount?: number;

  @ApiPropertyOptional({ description: 'Chi phí y tế (đồng)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  medicalCost?: number;

  @ApiPropertyOptional({ description: 'Tiền lương trả cho người bị nạn trong thời gian điều trị', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryCompensation?: number;

  @ApiPropertyOptional({ description: 'Tiền bồi thường, trợ cấp cho người bị nạn', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compensationCost?: number;

  @ApiPropertyOptional({ description: 'Thiệt hại tài sản (đồng)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  assetDamage?: number;

  @ApiPropertyOptional({ description: 'Tổng số ngày công nghỉ việc', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysLost?: number;

  @ApiPropertyOptional({ description: 'Danh sách chi tiết các vụ tai nạn', type: [ReportAccidentCaseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportAccidentCaseDto)
  accidentCases?: ReportAccidentCaseDto[];
}

// Main Report Update DTO
export class UpdateReportDataDto {
  @ApiPropertyOptional({ description: 'Tổng số lao động của công ty' })
  @IsOptional()
  @IsInt()
  @Min(0)
  companyEmployeeTotal?: number;

  @ApiPropertyOptional({ description: 'Số lao động nữ' })
  @IsOptional()
  @IsInt()
  @Min(0)
  femaleEmployeeTotal?: number;

  @ApiPropertyOptional({ description: 'Quỹ lương (đồng)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryFund?: number;

  @ApiPropertyOptional({ description: 'Dữ liệu phần tai nạn lao động (ACCIDENT)', type: ReportSectionUpdateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportSectionUpdateDto)
  accident?: ReportSectionUpdateDto;

  @ApiPropertyOptional({ description: 'Dữ liệu phần trợ cấp (ALLOWANCE)', type: ReportSectionUpdateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportSectionUpdateDto)
  allowance?: ReportSectionUpdateDto;
}
