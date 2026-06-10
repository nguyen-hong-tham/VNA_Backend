import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  ParseIntPipe,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnterpriseStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EnterpriseService } from '../services/enterprise.service';
import { SupabaseService } from '../services/supabase.service';
import { CreateEnterpriseDto } from '../dto/create-enterprise.dto';
import { UpdateEnterpriseDto, UpdateEnterpriseStatusDto } from '../dto/update-enterprise.dto';
import { ChangeEnterprisePasswordDto } from '../dto/change-enterprise-password.dto';

@ApiTags('Enterprises')
@Controller('enterprises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnterpriseController {
  constructor(
    private enterpriseService: EnterpriseService,
    private supabaseService: SupabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách doanh nghiệp (phân trang + lọc)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Trang hiện tại (mặc định: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số bản ghi trên mỗi trang (mặc định: 10)' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tên hoặc mã số thuế' })
  @ApiQuery({ name: 'businessTypeId', required: false, type: Number, description: 'Lọc theo ID loại hình kinh doanh' })
  @ApiQuery({ name: 'businessFieldId', required: false, type: Number, description: 'Lọc theo ID ngành nghề kinh doanh (cấp 4)' })
  @ApiQuery({ name: 'wardId', required: false, type: Number, description: 'Lọc theo ID phường/xã đăng ký' })
  @ApiQuery({ name: 'status', required: false, enum: EnterpriseStatus, description: 'Lọc theo trạng thái doanh nghiệp' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('businessTypeId') businessTypeId?: string,
    @Query('businessFieldId') businessFieldId?: string,
    @Query('wardId') wardId?: string,
    @Query('status') status?: EnterpriseStatus,
  ) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || '10', 10) || 10;
    const btId = businessTypeId ? parseInt(businessTypeId, 10) || undefined : undefined;
    const bfId = businessFieldId ? parseInt(businessFieldId, 10) || undefined : undefined;
    const wId = wardId ? parseInt(wardId, 10) || undefined : undefined;

    return this.enterpriseService.findAll(
      {
        search,
        businessTypeId: btId,
        businessFieldId: bfId,
        wardId: wId,
        status,
      },
      { page: pageNum, limit: limitNum },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết doanh nghiệp' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm mới doanh nghiệp (đồng thời tạo tài khoản đăng nhập)' })
  @ApiResponse({ status: 201, description: 'Thêm mới thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Mã số thuế đã tồn tại' })
  async create(@Body() dto: CreateEnterpriseDto) {
    return this.enterpriseService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin doanh nghiệp (không cho sửa mã số thuế)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseDto,
  ) {
    return this.enterpriseService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Bật/tắt trạng thái hoạt động của doanh nghiệp' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnterpriseStatusDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id; // Lấy ID tài khoản người duyệt từ request JWT
    return this.enterpriseService.updateStatus(id, dto.status, adminId);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản doanh nghiệp từ phía sở' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài khoản doanh nghiệp' })
  async changePassword(@Body() dto: ChangeEnterprisePasswordDto) {
    return this.enterpriseService.changePassword(dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải file tài liệu đính kèm lên Supabase Storage (PDF, Word, Ảnh)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'taxCode', required: false, description: 'Mã số thuế của doanh nghiệp để lưu vào thư mục riêng biệt' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File đính kèm (.pdf, .doc, .docx hoặc hình ảnh)',
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
  @ApiOperation({ summary: 'Xóa file đính kèm khỏi Supabase Storage' })
  @ApiQuery({ name: 'filePath', required: true, description: 'Đường dẫn đầy đủ của file cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa file thành công' })
  async deleteFile(@Query('filePath') filePath: string) {
    if (!filePath) {
      throw new BadRequestException('Vui lòng cung cấp đường dẫn filePath của file cần xóa');
    }
    await this.supabaseService.deleteFile(filePath);
    return { message: 'Đã xóa file đính kèm khỏi Supabase Storage thành công' };
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Nhập danh sách doanh nghiệp từ file Excel (.xlsx, .xls)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel chứa dữ liệu doanh nghiệp cần import',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import dữ liệu thành công' })
  async importFromFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024, // 10MB
            message: 'Dung lượng file import không được vượt quá 10MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.enterpriseService.importFromFile(file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa doanh nghiệp (đồng thời xóa tài khoản người dùng, báo cáo và tài liệu liên quan)' })
  @ApiResponse({ status: 200, description: 'Xóa doanh nghiệp thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy doanh nghiệp' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.enterpriseService.delete(id);
  }
}
