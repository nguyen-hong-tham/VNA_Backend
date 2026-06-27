import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SummaryReportService } from '../services/summary-report.service';
import { QuerySummaryReportDto } from '../dto/report_department/query-summary-report.dto';
import { AccidentClassificationService } from '../services/accident-classification.service';
@ApiTags('Summary-Report')
@Controller('summary-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@ApiBearerAuth()
export class SummaryReportController {
    constructor(private readonly summaryReportService: SummaryReportService,
        private readonly accidentClassificationService: AccidentClassificationService
    ) { }

    @Get('general-summary')
    @ApiOperation({
        summary: '[Sở] Lấy báo cáo tổng hợp - Phần I: Thông tin tổng quan',
        description: 'API tổng hợp số liệu tai nạn lao động của toàn bộ doanh nghiệp đã nộp báo cáo (Đã tiếp nhận) theo năm và tỉnh/thành phố.',
    })
    @ApiResponse({
        status: 200,
        description: 'Tổng hợp số liệu thành công',
    })
    async getGeneralSummary(@Query() query: QuerySummaryReportDto) {
        return this.summaryReportService.getGeneralSummary(query);
    }
    // API 2: Phần II (Phân loại tai nạn)
    @Get('accident-classified-summary')
    @ApiOperation({ summary: '[Sở] Lấy báo cáo tổng hợp - Phần II: Phân loại tai nạn lao động' })
    async getAccidentClassifiedSummary(@Query() query: QuerySummaryReportDto) {
        return this.accidentClassificationService.getAccidentClassifiedSummary(query);
    }
}