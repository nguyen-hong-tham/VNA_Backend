import { Controller, Get, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DepartmentReportService } from '../services/department-report.service';
import { QueryDepartmentReportDto } from '../dto/report_department/query-department-report.dto';
import { Request } from 'express';
import { PeriodType } from '@prisma/client';


interface AuthenticatedRequest extends Request {
    user: {
        userId: number;
        role: {
            code: string;
        };
        enterpriseId?: number;
        provinceId?: number;
        wardId?: number;
    };
}

@ApiTags('Department-Report')
@Controller('department-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@ApiBearerAuth()
export class DepartmentReportController {
    constructor(
        private readonly departmentReportService: DepartmentReportService,
    ) { }

    /**
 * API lấy danh sách báo cáo tai nạn lao động dành cho role Sở (ADMIN, MANAGER)
 * Hỗ trợ phân trang, tìm kiếm theo tên doanh nghiệp, mã số thuế
 * Lọc theo tỉnh/thành phố, phường/xã, năm báo cáo, kỳ báo cáo và trạng thái báo cáo
 */
    @Get()
    @ApiOperation({
        summary: '[Sở] Lấy danh sách báo cáo tai nạn lao động (Phân trang & Lọc)',
        description: 'API chính để hiển thị bảng báo cáo của các doanh nghiệp cho Role Sở (Quản lý/Admin). Hỗ trợ phân trang, tìm kiếm tự do theo Tên doanh nghiệp/Mã số thuế, và lọc theo Tỉnh, Phường/Xã, Năm, Kỳ báo cáo, Trạng thái.'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách báo cáo thành công'
    })
    async findAll(
        @Query() query: QueryDepartmentReportDto,
    ) {
        return this.departmentReportService.findAll(query);
    }


    /**
  * API thống kê số lượng báo cáo tai nạn lao động theo từng phường/xã
  * Trả về số liệu thống kê theo từng phường/xã của tỉnh được chọn
  * Hỗ trợ lọc theo năm báo cáo, tỉnh/thành phố và kỳ báo cáo
  */
    @Get('statistics-by-ward')
    @ApiOperation({
        summary: '[Sở] Thống kê số lượng báo cáo tai nạn lao động theo từng Phường/Xã',
        description: 'API phục vụ vẽ biểu đồ hoặc bảng tổng hợp phân bố báo cáo theo đơn vị hành chính cấp Phường/Xã trực thuộc Tỉnh đã chọn. Yêu cầu bắt buộc truyền năm báo cáo (year) và mã Tỉnh (provinceId).'
    })
    @ApiQuery({ name: 'year', required: true, type: Number, description: 'Năm cần thống kê' })
    @ApiQuery({ name: 'provinceId', required: true, type: Number, description: 'Mã số Tỉnh/Thành phố' })
    @ApiQuery({ name: 'periodType', required: false, enum: PeriodType, description: 'Kỳ báo cáo (HALF_YEAR: 6 tháng, YEAR: Cả năm)' })
    @ApiResponse({ status: 200, description: 'Lấy dữ liệu thống kê thành công' })
    async getStatisticsByWard(
        @Query('year', ParseIntPipe) year: number,
        @Query('provinceId', ParseIntPipe) provinceId: number,
        @Query('periodType') periodType?: PeriodType,
    ) {
        return this.departmentReportService.getStatisticsByWard(year, periodType, provinceId);
    }

    /**
 * API lấy danh sách tùy chọn bộ lọc cho màn hình báo cáo tai nạn lao động
 * Trả về danh sách năm báo cáo, kỳ báo cáo và trạng thái báo cáo
 * Dữ liệu được sử dụng để hiển thị các dropdown bộ lọc trên giao diện
 */
    @Get('filter-options')
    @ApiOperation({
        summary: '[Sở] Lấy danh sách tùy chọn bộ lọc phục vụ Dropdown (Năm, Kỳ, Trạng thái)',
        description: 'API phục vụ lấy dữ liệu nguồn để điền (populate) vào các ô chọn Dropdown trên giao diện lọc. Trả về mảng các năm hiện có trong database, danh sách các kỳ báo cáo và trạng thái kèm nhãn hiển thị tiếng Việt. Frontend nên gọi API này 1 lần duy nhất khi vừa tải trang.'
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách các tùy chọn thành công',
        schema: {
            example: {
                years: [2023, 2024, 2025, 2026],
                periodTypes: [
                    { value: 'HALF_YEAR', label: '6 tháng' },
                    { value: 'YEAR', label: 'Cả năm' }
                ],
                statuses: [
                    { value: 'REPORTING', label: 'Đang báo cáo' },
                    { value: 'APPROVED', label: 'Đã tiếp nhận' }
                ]
            }
        }
    })
    async getFilterOptions() {
        return this.departmentReportService.getFilterOptions();
    }

}
