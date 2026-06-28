import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PeriodType } from '@prisma/client';

import { DepartmentReportRepository } from '../repositories/department-report.repository';
import { QueryDepartmentReportDto } from '../dto/report_department/query-department-report.dto';
import { report } from 'process';

@Injectable()
export class DepartmentReportService {
  constructor(
    private readonly reportRepo: DepartmentReportRepository,
  ) { }

  // Lấy danh sách báo cáo
  async findAll(query: QueryDepartmentReportDto,) {
    if (query.wardId && !query.provinceId) {
      throw new BadRequestException('Vui lòng chọn tỉnh/ thành phố trước khi chọn Phường/xã');
    }
    const page = query.current || 1;
    const limit = query.limit || 10;

    const filter: any = {
      year: query.year, // Không tự động gán mặc định currentYear ở backend
      provinceId: query.provinceId,
      wardId: query.wardId,
      enterpriseName: query.enterpriseName,
      taxCode: query.taxCode,
      periodType: query.periodType,
      status: query.status,
    };

    const { data, total } = await this.reportRepo.findAll(filter, { page, limit })

    // Chuẩn hóa dữ liệu trả về theo thiết kế API
    const formattedData = data.map((report) => {
      let statusLabel = 'Không xác định';
      if (report.status === 'REPORTING') {
        statusLabel = 'Đang báo cáo';
      } else if (report.status === 'SUBMITTED') {
        statusLabel = 'Chờ tiếp nhận';
      } else if (report.status === 'APPROVED') {
        statusLabel = 'Đã tiếp nhận';
      } else if (report.status === 'REJECTED') {
        statusLabel = 'Từ chối';
      }

      return {
        reportId: report.id,
        enterpriseId: report.enterpriseId,
        enterpriseName: report.enterprise.name,
        taxCode: report.enterprise.taxCode,
        provinceId: report.enterprise.provinceId,
        wardId: report.enterprise.wardId,
        periodType: report.reportPeriod.periodType,
        year: report.reportPeriod.year,
        status: report.status,
        statusLabel: statusLabel,
      }
    }
    )
    return {
      data: formattedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

  }

  // thống kê theo phường
  async getStatisticsByWard(
    year: number,
    periodType: PeriodType | undefined,
    provinceId: number,
  ) {
    return this.reportRepo.getStatisticsByWard(provinceId, year, periodType);
  }

  async getFilterOptions() {
    const years = await this.reportRepo.getReportYears();

    const periodTypes = [
      {
        value: 'HALF_YEAR', label: '6 tháng'
      },
      {
        value: 'YEAR', label: '1 năm'
      }
    ]
    const statuses = [
      { value: 'REPORTING', label: 'Đang báo cáo' },
      { value: 'SUBMITTED', label: 'Chờ tiếp nhận' },
      { value: 'APPROVED', label: 'Đã tiếp nhận' },
      { value: 'REJECTED', label: 'Từ chối' },
    ];
    return {
      years,       // Trả về: [2023, 2024, 2025, ...]
      periodTypes, // Trả về: [{ value: 'HALF_YEAR', label: '6 tháng' }, ...]
      statuses,    // Trả về: [{ value: 'REPORTING', label: 'Đang báo cáo' }, ...]
    };
  }

}