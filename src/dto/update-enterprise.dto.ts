import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsEnum,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EnterpriseDocumentDto } from './create-enterprise.dto';
import { EnterpriseStatus } from '@prisma/client';

export class UpdateEnterpriseDto {
  @ApiProperty({
    example: 'Công ty TNHH ABC (Cập nhật)',
    description: 'Tên doanh nghiệp',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Tên doanh nghiệp không được để trống' })
  @IsString({ message: 'Tên doanh nghiệp phải là chuỗi ký tự' })
  name?: string;

  @ApiProperty({
    example: 'GPD1000001-C',
    description: 'Số giấy phép kinh doanh',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Số giấy phép kinh doanh không được để trống' })
  @IsString()
  licenseNumber?: string;

  @ApiProperty({
    example: '2026-06-07',
    description: 'Ngày cấp giấy phép kinh doanh',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : null))
  licenseIssueDate?: Date;

  @ApiProperty({
    example: 1,
    description: 'ID loại hình kinh doanh (đang hoạt động)',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID loại hình kinh doanh phải là số nguyên' })
  @Type(() => Number)
  businessTypeId?: number;

  @ApiProperty({
    example: 4,
    description: 'ID ngành nghề kinh doanh (phải ở Cấp 4 và đang hoạt động)',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID ngành nghề kinh doanh phải là số nguyên' })
  @Type(() => Number)
  businessFieldId?: number;

  @ApiProperty({
    example: 79,
    description: 'ID Tỉnh/Thành phố đăng ký doanh nghiệp',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID Tỉnh/Thành phố đăng ký phải là số nguyên' })
  @Type(() => Number)
  provinceId?: number;

  @ApiProperty({
    example: 27435,
    description: 'ID Phường/Xã đăng ký doanh nghiệp',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID Phường/Xã đăng ký phải là số nguyên' })
  @Type(() => Number)
  wardId?: number;

  @ApiProperty({
    example: '123 Đường Lê Lợi, Quận 1',
    description: 'Địa chỉ đăng ký doanh nghiệp',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Địa chỉ đăng ký không được để trống' })
  @IsString({ message: 'Địa chỉ đăng ký phải là chuỗi ký tự' })
  registeredAddress?: string;

  @ApiProperty({
    example: 79,
    description: 'ID Tỉnh/TP hoạt động kinh doanh',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID Tỉnh/TP hoạt động phải là số nguyên' })
  @Type(() => Number)
  operatingProvinceId?: number;

  @ApiProperty({
    example: 27435,
    description: 'ID Phường/Xã hoạt động kinh doanh',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID Phường/Xã hoạt động phải là số nguyên' })
  @Type(() => Number)
  operatingWardId?: number;

  @ApiProperty({
    example: '456 Đường Nguyễn Huệ, Quận 1',
    description: 'Địa chỉ hoạt động kinh doanh thực tế',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Địa chỉ hoạt động không được để trống' })
  @IsString()
  operatingAddress?: string;

  @ApiProperty({
    example: 'ABC COMPANY LIMITED',
    description: 'Tên viết bằng tiếng nước ngoài',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Tên tiếng nước ngoài không được để trống' })
  @IsString()
  englishName?: string;

  @ApiProperty({
    example: 'contact@abc.com',
    description: 'Địa chỉ email doanh nghiệp',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  email?: string;

  @ApiProperty({
    example: '02838212345',
    description: 'Số điện thoại cơ quan',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Số điện thoại cơ quan không được để trống' })
  @IsString()
  @Matches(/^(0|\+84)\d{9,10}$/, {
    message:
      'Số điện thoại cơ quan không đúng định dạng (phải bắt đầu bằng 0 hoặc +84 và có 10 hoặc 11 chữ số)',
  })
  officePhone?: string;

  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Người đứng đầu / Đại diện doanh nghiệp',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Người đứng đầu không được để trống' })
  @IsString({ message: 'Người đứng đầu phải là chuỗi ký tự' })
  representativeName?: string;

  @ApiProperty({
    example: '0909123456',
    description: 'Số điện thoại người đứng đầu',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Số điện thoại người đứng đầu không được để trống' })
  @IsString()
  @Matches(/^(0|\+84)\d{9,10}$/, {
    message:
      'Số điện thoại người đứng đầu không đúng định dạng (phải bắt đầu bằng 0 hoặc +84 và có 10 hoặc 11 chữ số)',
  })
  representativePhone?: string;

  @ApiProperty({
    type: [EnterpriseDocumentDto],
    description: 'Danh sách các tài liệu/file đính kèm',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnterpriseDocumentDto)
  documents?: EnterpriseDocumentDto[];
}

export class UpdateEnterpriseStatusDto {
  @ApiProperty({
    enum: EnterpriseStatus,
    example: EnterpriseStatus.APPROVED,
    description: 'Trạng thái hoạt động của doanh nghiệp',
  })
  @IsEnum(EnterpriseStatus, { message: 'Trạng thái không hợp lệ' })
  status: EnterpriseStatus;
}
