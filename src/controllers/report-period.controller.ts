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

    @Get()
    @Roles('ADMIN', 'MANAGER', 'STAFF', 'ENTERPRISE')
    @ApiOperation({ summary: 'Lấy danh sách các kỳ báo cáo (Phân trang, lọc, tìm kiếm)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAll(@Query() query: QueryReportPeriodDto) {
        return this.reportPeriodService.findAll(query);
    }

    @Get(':id')
    @Roles('ADMIN', 'MANAGER', 'STAFF', 'ENTERPRISE')
    @ApiOperation({ summary: 'Lấy chi tiết thông tin một kỳ báo cáo' })
    @ApiResponse({ status: 200, description: 'Trả về chi tiết kỳ báo cáo' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy kỳ báo cáo' })
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.reportPeriodService.findById(id);
    }

    @Post()
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Tạo mới một kỳ báo cáo (Chỉ Admin/Manager)' })
    @ApiResponse({ status: 201, description: 'Tạo mới thành công' })
    async create(@Body() dto: CreateReportPeriodDto) {
        return this.reportPeriodService.create(dto);
    }

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

    @Delete(':id')
    @Roles('ADMIN', 'MANAGER')
    @ApiOperation({ summary: 'Xóa một kỳ báo cáo (Chỉ Admin/Manager)' })
    @ApiResponse({ status: 200, description: 'Xóa kỳ báo cáo thành công' })
    async delete(@Param('id', ParseIntPipe) id: number) {
        return this.reportPeriodService.delete(id);
    }
}