import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportService } from '../services/report.service';
import { UpdateReportDataDto } from '../dto/report.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: { code: string };
    [key: string]: unknown;
  };
}

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ENTERPRISE')
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // GET /reports/categories
  @Get('categories')
  @ApiOperation({
    summary:
      'Lấy danh mục phân loại (nguyên nhân tai nạn, yếu tố gây thương tích, nghề nghiệp, loại thương tích)',
  })
  @ApiResponse({ status: 200, description: 'Trả về các danh mục phân loại' })
  getCategories() {
    return this.reportService.getCategories();
  }

  // GET /reports
  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách kỳ báo cáo và trạng thái báo cáo của doanh nghiệp',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Lọc theo năm (ví dụ: 2024)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về danh sách kỳ báo cáo kèm trạng thái báo cáo',
  })
  getPeriodsAndReports(
    @Req() req: AuthenticatedRequest,
    @Query('year') year?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.reportService.getPeriodsAndReports(req.user.id, parsedYear);
  }

  // POST /reports/period/:periodId/init
  @Post('period/:periodId/init')
  @ApiOperation({
    summary:
      'Khởi tạo báo cáo cho một kỳ (nếu chưa có sẽ tạo mới, nếu đã có sẽ trả về báo cáo hiện tại)',
  })
  @ApiResponse({ status: 201, description: 'Báo cáo đã được khởi tạo hoặc tìm thấy' })
  initializeReport(
    @Req() req: AuthenticatedRequest,
    @Param('periodId', ParseIntPipe) periodId: number,
  ) {
    return this.reportService.initializeReport(req.user.id, periodId);
  }

  // GET /reports/:id
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết báo cáo theo ID' })
  @ApiResponse({ status: 200, description: 'Chi tiết báo cáo' })
  getReportDetails(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportService.getReportDetails(req.user.id, id);
  }

  // PUT /reports/:id
  @Put(':id')
  @ApiOperation({
    summary:
      'Lưu nháp báo cáo (thông tin công ty, số liệu tai nạn, trợ cấp)',
  })
  @ApiResponse({ status: 200, description: 'Báo cáo đã được cập nhật' })
  updateReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDataDto,
  ) {
    return this.reportService.updateReport(req.user.id, id, dto);
  }

  // POST /reports/:id/submit
  @Post(':id/submit')
  @ApiOperation({ summary: 'Nộp báo cáo (chuyển trạng thái sang SUBMITTED)' })
  @ApiResponse({ status: 200, description: 'Báo cáo đã được nộp thành công' })
  submitReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportService.submitReport(req.user.id, id);
  }

  // POST /reports/:id/upload
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải lên file báo cáo có dấu (PDF hoặc ảnh)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File báo cáo có dấu (PDF hoặc hình ảnh, tối đa 10MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'File đã được tải lên thành công' })
  uploadStampedFile(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reportService.uploadStampedFile(req.user.id, id, file);
  }

  // GET /reports/:id/export-word
  @Get(':id/export-word')
  @ApiOperation({ summary: 'Xuất báo cáo ra file Word (.docx)' })
  @ApiResponse({ status: 200, description: 'File Word báo cáo' })
  async exportWordReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: import('express').Response,
  ) {
    const { buffer, fileName } = await this.reportService.exportWordReport(req.user.id, id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);
  }
}
