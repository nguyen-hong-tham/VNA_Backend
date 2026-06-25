import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportPeriodService } from '../services/report-period.service';
import {
    CreateReportPeriodDto,
    QueryReportPeriodDto,
    UpdatePeriodStatusDto,
    UpdateReportPeriodDto,
} from '../dto/report-period';
@ApiTags('Report Periods')
@Controller('report-periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportPeriodController {
    constructor(private readonly reportPeriodService: ReportPeriodService) { }

    /**
     * API: Lấy danh sách kỳ báo cáo (hỗ trợ phân trang, tìm kiếm theo tên và lọc theo năm, loại kỳ, trạng thái)
     * Quyền truy cập: ADMIN, MANAGER, STAFF, ENTERPRISE (Tất cả vai trò trong hệ thống)
     * @Query query: QueryReportPeriodDto chứa bộ lọc tìm kiếm và các thông số phân trang
     * @returns Trả về đối tượng chứa mảng dữ liệu các kỳ báo cáo, tổng số bản ghi và thông tin phân trang
     */
    @Get()
    @Roles('ADMIN', 'MANAGER', 'STAFF', 'ENTERPRISE')
    @ApiOperation({ summary: 'Lấy danh sách các kỳ báo cáo (Phân trang, lọc, tìm kiếm)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAll(@Query() query: QueryReportPeriodDto) {
        return this.reportPeriodService.findAll(query);
    }

    /**
     * API: Lấy thông tin chi tiết của một kỳ báo cáo dựa trên khóa chính ID
     * Quyền truy cập: ADMIN, MANAGER, STAFF, ENTERPRISE (Tất cả vai trò trong hệ thống)
     * @Param id: ID của kỳ báo cáo, tự động ép sang kiểu số nguyên (ParseIntPipe)
     * @returns Thông tin chi tiết của kỳ báo cáo
     * @throws NotFoundException (404) nếu không tìm thấy ID kỳ báo cáo tương ứng
     */
    @Get(':id')
    @Roles('ADMIN', 'MANAGER', 'STAFF', 'ENTERPRISE')
    @ApiOperation({ summary: 'Lấy chi tiết thông tin một kỳ báo cáo' })
    @ApiResponse({ status: 200, description: 'Trả về chi tiết kỳ báo cáo' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kỳ báo cáo' })
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.reportPeriodService.findById(id);
    }

    /**
     * API: Tạo mới một kỳ báo cáo (Chỉ có hiệu lực khi chưa trùng loại kỳ YEAR/HALF_YEAR cho năm đã chọn)
     * Quyền truy cập: ADMIN, MANAGER (Chỉ cấp quản trị/nhân viên điều hành)
     * @Body dto: CreateReportPeriodDto chứa thông tin bắt buộc: tên, năm, loại kỳ, ngày bắt đầu và kết thúc. Trạng thái mặc định là OPEN
     * @returns Kỳ báo cáo mới được khởi tạo thành công
     * @throws ConflictException (409) nếu loại kỳ này của năm tương ứng đã tồn tại
     * @throws BadRequestException (400) nếu ngày bắt đầu >= ngày kết thúc hoặc dữ liệu không hợp lệ
     */
    @Post()
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Tạo mới một kỳ báo cáo (Chỉ Admin/Manager)' })
    @ApiResponse({ status: 201, description: 'Tạo mới thành công' })
    async create(@Body() dto: CreateReportPeriodDto) {
        return this.reportPeriodService.create(dto);
    }

    /**
     * API: Cập nhật cấu hình ngày bắt đầu, ngày kết thúc và trạng thái của kỳ báo cáo
     * Quyền truy cập: ADMIN, MANAGER (Chỉ cấp quản trị/nhân viên điều hành)
     * @Param id: ID của kỳ báo cáo cần chỉnh sửa
     * @Body dto: UpdateReportPeriodDto chứa các trường cần sửa (chỉ cho phép sửa startDate, endDate, status)
     * @returns Kỳ báo cáo sau khi được cập nhật dữ liệu
     * @throws BadRequestException (400) nếu cố tình chỉnh sửa reportName, periodType, year hoặc gửi giá trị null/undefined cho ngày
     */
    @Put(':id')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Cập nhật thông tin kỳ báo cáo (Chỉ Admin/Manager)' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateReportPeriodDto,
    ) {
        return this.reportPeriodService.update(id, dto);
    }

    /**
     * API: Cập nhật nhanh trạng thái bật/tắt hoạt động của kỳ báo cáo
     * Quyền truy cập: ADMIN, MANAGER
     * @Param id: ID của kỳ báo cáo cần cập nhật trạng thái
     * @Body dto: UpdatePeriodStatusDto chứa trạng thái hoạt động mới (OPEN hoặc CLOSED)
     * @returns Kỳ báo cáo sau khi đã được cập nhật trạng thái hoạt động
     */
    @Patch(':id/status')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Cập nhật trạng thái kỳ báo cáo (Chỉ Admin/Manager)' })
    @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePeriodStatusDto,
    ) {
        return this.reportPeriodService.updateStatus(id, dto.status);
    }

    /**
     * API: Xóa vĩnh viễn một kỳ báo cáo ra khỏi hệ thống
     * Quyền truy cập: ADMIN, MANAGER
     * @Param id: ID của kỳ báo cáo cần xóa
     * @returns Kết quả xóa thành công
     * @throws BadRequestException (400) nếu kỳ báo cáo đã phát sinh các biểu mẫu báo cáo của doanh nghiệp (để bảo vệ toàn vẹn dữ liệu)
     */
    @Delete(':id')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Xóa một kỳ báo cáo (Chỉ Admin/Manager)' })
    @ApiResponse({ status: 200, description: 'Xóa kỳ báo cáo thành công' })
    async delete(@Param('id', ParseIntPipe) id: number) {
        return this.reportPeriodService.delete(id);
    }
}