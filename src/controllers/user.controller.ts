import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { VerifyEmailChangeDto } from '../dto/verify-email-change.dto';
import { UpdateEmailDto } from '../dto/update-email.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    fullName: string | null;
    isActive: boolean;
    username: string;
  };
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private authService: AuthService) { }

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin chi tiết tài khoản',
  })
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin chi tiết người dùng' })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên và cập nhật ảnh đại diện (avatar) qua Supabase Storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh đại diện (png, jpeg, jpg, gif, webp; tối đa 2MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật ảnh đại diện thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'File tải lên không hợp lệ (không phải ảnh hoặc vượt quá 2MB)',
  })
  async uploadAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Dung lượng file không được vượt quá 2MB',
          }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|png|jpg|gif|webp)/,
            fallbackToMimetype: true,
          } as any),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.authService.updateAvatar(req.user.id, file);
  }

  @Post('email-change/request')
  @ApiOperation({
    summary: 'Yêu cầu thay đổi email (Gửi mã OTP về email hiện tại)',
  })
  async requestEmailChange(@Req() req: AuthenticatedRequest) {
    return this.authService.requestEmailChange(req.user.id);
  }

  @Post('email-change/verify')
  @ApiOperation({ summary: 'Xác thực mã OTP để thay đổi email' })
  async verifyEmailChange(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VerifyEmailChangeDto,
  ) {
    return this.authService.verifyEmailChange(req.user.id, dto);
  }

  @Post('email-change/update')
  @ApiOperation({ summary: 'Nhập email mới sau khi xác thực OTP thành công' })
  async updateEmail(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.authService.updateEmail(req.user.id, dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu người dùng' })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
