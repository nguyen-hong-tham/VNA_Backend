import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DocumentType } from '@prisma/client';

export class EnterpriseDocumentDto {
  @ApiProperty({
    example: 'Giấy phép kinh doanh',
    description: 'Tên tài liệu đính kèm',
  })
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống' })
  @IsString({ message: 'Tên tài liệu phải là chuỗi ký tự' })
  documentName: string;

  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.BUSINESS_LICENSE,
    description: 'Loại tài liệu',
  })
  @IsNotEmpty({ message: 'Loại tài liệu không được để trống' })
  @IsEnum(DocumentType, { message: 'Loại tài liệu không hợp lệ' })
  documentType: DocumentType;

  @ApiProperty({
    example: 'license.pdf',
    description: 'Tên file vật lý',
  })
  @IsNotEmpty({ message: 'Tên file không được để trống' })
  @IsString({ message: 'Tên file phải là chuỗi ký tự' })
  fileName: string;

  @ApiProperty({
    example:
      'https://zufqfogsgqlfeokkiyvb.supabase.co/storage/v1/object/public/avatars/documents/license.pdf',
    description: 'Đường dẫn file lưu trữ',
  })
  @IsNotEmpty({ message: 'Đường dẫn file không được để trống' })
  @IsString({ message: 'Đường dẫn file phải là chuỗi ký tự' })
  filePath: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'Định dạng file',
    required: false,
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    example: 102400,
    description: 'Dung lượng file (bytes)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  fileSize?: number;
}

export class CreateEnterpriseDto {
  @ApiProperty({
    example: 'Công ty TNHH ABC',
    description: 'Tên doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Tên doanh nghiệp không được để trống' })
  @IsString({ message: 'Tên doanh nghiệp phải là chuỗi ký tự' })
  name: string;

  @ApiProperty({
    example: '0312345678',
    description: 'Mã số thuế doanh nghiệp (đúng 10 chữ số)',
  })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10}$/, { message: 'Mã số thuế phải bao gồm đúng 10 chữ số' })
  taxCode: string;

  @ApiProperty({
    example: 'GPD1000001',
    description: 'Số giấy phép kinh doanh (mặc định trùng với MST nếu trống)',
    required: false,
  })
  @IsOptional()
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
  })
  @IsNotEmpty({ message: 'Loại hình kinh doanh không được để trống' })
  @IsInt({ message: 'ID loại hình kinh doanh phải là số nguyên' })
  @Type(() => Number)
  businessTypeId: number;

  @ApiProperty({
    example: 4,
    description: 'ID ngành nghề kinh doanh (phải ở Cấp 4 và đang hoạt động)',
  })
  @IsNotEmpty({ message: 'Ngành nghề kinh doanh không được để trống' })
  @IsInt({ message: 'ID ngành nghề kinh doanh phải là số nguyên' })
  @Type(() => Number)
  businessFieldId: number;

  @ApiProperty({
    example: 79,
    description: 'ID Tỉnh/Thành phố đăng ký doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố đăng ký không được để trống' })
  @IsInt({ message: 'ID Tỉnh/Thành phố đăng ký phải là số nguyên' })
  @Type(() => Number)
  provinceId: number;

  @ApiProperty({
    example: 27435,
    description: 'ID Phường/Xã đăng ký doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Phường/Xã đăng ký không được để trống' })
  @IsInt({ message: 'ID Phường/Xã đăng ký phải là số nguyên' })
  @Type(() => Number)
  wardId: number;

  @ApiProperty({
    example: '123 Đường Lê Lợi, Quận 1',
    description: 'Địa chỉ đăng ký doanh nghiệp',
    required: false,
  })
  @IsOptional()
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
  provinceIdActivity?: number;

  @ApiProperty({
    example: 27435,
    description: 'ID Phường/Xã hoạt động kinh doanh',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'ID Phường/Xã hoạt động phải là số nguyên' })
  @Type(() => Number)
  wardIdActivity?: number;

  @ApiProperty({
    example: '456 Đường Nguyễn Huệ, Quận 1',
    description: 'Địa chỉ hoạt động kinh doanh thực tế',
    required: false,
  })
  @IsOptional()
  @IsString()
  operatingAddress?: string;

  @ApiProperty({
    example: 'ABC COMPANY LIMITED',
    description: 'Tên viết bằng tiếng nước ngoài',
    required: false,
  })
  @IsOptional()
  @IsString()
  englishName?: string;

  @ApiProperty({
    example: 'contact@abc.com',
    description: 'Địa chỉ email doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  email: string;

  @ApiProperty({
    example: '02838212345',
    description: 'Số điện thoại cơ quan',
    required: false,
  })
  @IsOptional()
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
  @IsString({ message: 'Người đứng đầu phải là chuỗi ký tự' })
  representativeName?: string;

  @ApiProperty({
    example: '0909123456',
    description: 'Số điện thoại người đứng đầu',
    required: false,
  })
  @IsOptional()
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
