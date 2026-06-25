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

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách báo cáo tai nạn lao động'
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


    @Get('statistics-by-ward')
    @ApiOperation({
        summary: '[Sở] Thống kê số lượng báo cáo tai nạn lao động theo từng Phường/Xã',
    })
    @ApiQuery({ name: 'year', required: true, type: Number })
    @ApiQuery({ name: 'provinceId', required: true, type: Number })
    @ApiQuery({ name: 'periodType', required: false, enum: PeriodType })
    @ApiResponse({ status: 200, description: 'Lấy dữ liệu thống kê thành công' })
    async getStatisticsByWard(
        @Query('year', ParseIntPipe) year: number,
        @Query('provinceId', ParseIntPipe) provinceId: number,
        @Query('periodType') periodType?: PeriodType,
    ) {
        return this.departmentReportService.getStatisticsByWard(year, periodType, provinceId);
    }

    @Get('years')
    @ApiOperation({
        summary: '[Sở] Lấy danh sách năm báo cáo từ min đến max trong database',
    })
    @ApiResponse({ status: 200, description: 'Lấy danh sách năm thành công' })
    async getReportYears() {
        return this.departmentReportService.getReportYears();
    }
}
