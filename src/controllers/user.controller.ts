import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  BadRequestException,
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
import { QueryUserDto } from '../dto/user/query_user.dto';
import { UserService } from '../services/user.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { UpdateStatusDto } from '../dto/user/update-status.dto';
import { BulkDeleteDto } from '../dto/user/bulk-delete.dto';
import { ResetPasswordAdminDto } from '../dto/user/reset-password.dto';
import { Res } from '@nestjs/common';
import express from 'express';

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
  constructor(private authService: AuthService, private userService: UserService) { }

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
          }),
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

  // ----------------------admin quản lý ng dùng--------------------------------

  @Get('get-all')
  @Roles('ADMIN', 'MANAGER', 'STAFF') // Chỉ cho phép cán bộ nội bộ truy cập xem danh sách
  @ApiOperation({ summary: 'Lấy danh sách người dùng nội bộ (tìm kiếm, lọc, phân trang)' })
  async queryUser(@Query() query: QueryUserDto) {
    return this.userService.getUser(query);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo tài khoản người dùng mới (Chỉ Admin)' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật thông tin chi tiết người dùng (Chỉ Admin)' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, dto);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Kích hoạt hoặc khóa tài khoản người dùng (Chỉ Admin)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Ngăn chặn Admin tự khóa tài khoản của chính mình
    if (id === req.user.id) {
      throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình');
    }
    return this.userService.updateStatus(id, dto.isActive);
  }

  @Post('bulk-delete')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa nhiều người dùng cùng lúc (Chỉ Admin)' })
  async bulkDelete(
    @Body() dto: BulkDeleteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Lọc bỏ ID của Admin đang thực hiện xóa ra khỏi danh sách
    const filteredIds = dto.ids.filter((id) => id !== req.user.id);
    if (filteredIds.length === 0) {
      throw new BadRequestException('Không thể xóa tài khoản của chính bạn');
    }
    return this.userService.bulkDelete(filteredIds);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Đặt lại mật khẩu cho tài khoản khác và bắt buộc đăng xuất (Chỉ Admin)' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordAdminDto,
  ) {
    await this.userService.resetPassword(id, dto.newPassword);
    return {
      message: 'Đã đặt lại mật khẩu thành công và buộc đăng xuất các phiên đăng nhập khác',
    };
  }

  @Post('import')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Nhập danh sách cán bộ từ file Excel (.xlsx)' })
  async importUsers(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Dung lượng file không được vượt quá 5MB',
          }),
          new FileTypeValidator({
            fileType: /application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.userService.importFromExcel(file);
  }

  @Get('export')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Xuất danh sách cán bộ ra file Excel (.xlsx)' })
  async exportUsers(@Res() res: express.Response) {
    const buffer = await this.userService.exportToExcel();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="danh_sach_nguoi_dung.xlsx"',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
