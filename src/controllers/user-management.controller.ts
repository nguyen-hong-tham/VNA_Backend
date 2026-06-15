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
  Res,
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
import express from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserService } from '../services/user.service';
import { SupabaseService } from '../services/supabase.service';
import { QueryUserDto } from '../dto/user/query_user.dto';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { UpdateStatusDto } from '../dto/user/update-status.dto';
import { BulkDeleteDto } from '../dto/user/bulk-delete.dto';
import { ResetPasswordAdminDto } from '../dto/user/reset-password.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    fullName: string | null;
    isActive: boolean;
    username: string;
  };
}

@ApiTags('User Management')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(
    private userService: UserService,
    private supabaseService: SupabaseService,
  ) { }

  @Get('get-all')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách người dùng nội bộ (tìm kiếm, lọc, phân trang)' })
  async queryUser(@Query() query: QueryUserDto) {
    return this.userService.getUser(query);
  }

  @Get('roles')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách các vai trò (loại trừ Enterprise)' })
  async getRoles() {
    return this.userService.getRoles();
  }

  @Get('positions')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách chức vụ/chức danh công việc hiện có' })
  async getPositions() {
    return this.userService.getPositions();
  }

  @Post('upload-avatar')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên ảnh đại diện cho tài khoản cán bộ nội bộ khác (Chỉ Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File ảnh đại diện (png, jpeg, jpg, gif, webp; tối đa 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tải lên ảnh đại diện thành công, trả về URL công khai',
  })
  async uploadUserAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Dung lượng file không được vượt quá 5MB',
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
    const url = await this.supabaseService.uploadAvatar(file);
    return { url };
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel (.xlsx) chứa danh sách cán bộ (tối đa 5MB)',
        },
      },
      required: ['file'],
    },
  })
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
            fallbackToMimetype: true,
          } as any),
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

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một cán bộ nội bộ theo ID' })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }
}
