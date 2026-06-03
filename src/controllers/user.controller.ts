import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { VerifyEmailChangeDto } from '../dto/verify-email-change.dto';
import { UpdateEmailDto } from '../dto/update-email.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private authService: AuthService) {}

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
