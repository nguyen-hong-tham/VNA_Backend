import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập người dùng' })
  @ApiResponse({
    status: 200,
    description:
      'Đăng nhập thành công, Cookie access_token và refresh_token được thiết lập',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set Access Token HTTP-Only Cookie (expires in 15 mins)
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    // Set Refresh Token HTTP-Only Cookie (expires in 7 days)
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = (request.cookies || {}) as Record<string, string>;
    const refreshToken = cookies['refresh_token'];

    if (!refreshToken) {
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');
      throw new UnauthorizedException('Không tìm thấy phiên làm việc');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // Set New Access Token Cookie
    response.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return {
      message: 'Làm mới token thành công',
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất tài khoản' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { message: 'Đăng xuất thành công' };
  }

  ////////// forgot password & reset password //////////
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu gửi mã OTP khôi phục mật khẩu qua email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gửi email thành công và tạo OTP thành công.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Email chưa được đăng ký. Xin vui lòng thử lại.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Định dạng email gửi lên không hợp lệ.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác thực OTP và đặt lại mật khẩu mới cho tài khoản',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Khôi phục mật khẩu thành công.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'OTP không hợp lệ/hết hạn hoặc mật khẩu xác nhận không khớp.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
