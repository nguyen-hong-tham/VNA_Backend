import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
  Query,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnterpriseRegistrationService } from '../services/enterprise-registration.service';
import { SupabaseService } from '../services/supabase.service';
import {
  RegisterEnterpriseDto,
  VerifyRegistrationOtpDto,
  ConfirmRegistrationDto,
} from '../dto/register-enterprise.dto';

@ApiTags('Enterprise Registration')
@Controller('auth/register-enterprise')
export class EnterpriseRegistrationController {
  constructor(
    private enterpriseRegistrationService: EnterpriseRegistrationService,
    private supabaseService: SupabaseService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Yêu cầu đăng ký tài khoản doanh nghiệp mới & gửi mã OTP qua email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Yêu cầu đăng ký thành công, mã OTP đã gửi.',
  })
  async registerEnterpriseRequest(@Body() dto: RegisterEnterpriseDto) {
    return this.enterpriseRegistrationService.registerEnterpriseRequest(dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực mã OTP đăng ký doanh nghiệp' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xác thực OTP thành công.',
  })
  async verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.enterpriseRegistrationService.verifyRegistrationOtp(dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác nhận hoàn tất đăng ký doanh nghiệp và kích hoạt tài khoản',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Đăng ký doanh nghiệp thành công, trả về tài khoản và mật khẩu.',
  })
  async confirmRegistration(@Body() dto: ConfirmRegistrationDto) {
    return this.enterpriseRegistrationService.confirmRegistration(dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Tải file tài liệu đính kèm lên Supabase Storage (Công khai dành cho Đăng ký)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'taxCode',
    required: false,
    description: 'Mã số thuế của doanh nghiệp để lưu vào thư mục riêng biệt',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File đính kèm (.pdf, hình ảnh)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Tải file thành công' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024, // 10MB
            message: 'Dung lượng file đính kèm không được vượt quá 10MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Query('taxCode') taxCode?: string,
  ) {
    return this.supabaseService.uploadFile(file, taxCode);
  }

  @Delete('upload')
  @ApiOperation({
    summary:
      'Xóa file đính kèm khỏi Supabase Storage (Công khai dành cho Đăng ký)',
  })
  @ApiQuery({
    name: 'filePath',
    required: true,
    description: 'Đường dẫn đầy đủ của file cần xóa',
  })
  @ApiResponse({ status: 200, description: 'Xóa file thành công' })
  async deleteFile(@Query('filePath') filePath: string) {
    if (!filePath) {
      throw new BadRequestException(
        'Vui lòng cung cấp đường dẫn filePath của file cần xóa',
      );
    }
    await this.supabaseService.deleteFile(filePath);
    return { message: 'Đã xóa file đính kèm khỏi Supabase Storage thành công' };
  }
}
