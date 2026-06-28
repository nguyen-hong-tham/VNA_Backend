import { Injectable } from '@nestjs/common';
import { Prisma, PeriodType, ReportStatus } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class DepartmentReportRepository {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Truy vấn danh sách báo cáo tai nạn lao động có bộ lọc và phân trang (JOIN Enterprise & Period)
   */
  async findAll(
    filter: {
      year: number;
      provinceId?: number;
      wardId?: number;
      enterpriseName?: string;
      taxCode?: string;
      periodType?: PeriodType;
      status?: 'REPORTING' | 'APPROVED' | 'DRAFT' | 'SUBMITTED' | 'REJECTED';
    },
    pagination: {
      page: number;
      limit: number;
    },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Dựng điều kiện lọc trên bảng Report
    const where: Prisma.ReportWhereInput = {};

    if (filter.year !== undefined || filter.periodType) {
      where.reportPeriod = {
        ...(filter.year !== undefined ? { year: filter.year } : {}),
        ...(filter.periodType ? { periodType: filter.periodType } : {}),
      };
    }

    // Ánh xạ trạng thái lọc từ DTO xuống DB (Chấp nhận cả DRAFT và REPORTING)
    if (filter.status) {
      if (filter.status === 'REPORTING' || filter.status === 'DRAFT') {
        where.status = ReportStatus.REPORTING;
      } else if (filter.status === 'APPROVED') {
        where.status = ReportStatus.APPROVED;
      } else if (filter.status === 'SUBMITTED') {
        where.status = ReportStatus.SUBMITTED;
      } else if (filter.status === 'REJECTED') {
        where.status = ReportStatus.REJECTED;
      }
    }

    // Lọc theo các trường thuộc bảng doanh nghiệp liên kết
    if (filter.provinceId || filter.wardId || filter.enterpriseName || filter.taxCode) {
      where.enterprise = {
        status: 'APPROVED', // Chỉ lấy doanh nghiệp hoạt động hợp lệ
        ...(filter.provinceId ? { provinceId: filter.provinceId } : {}),
        ...(filter.wardId ? { wardId: filter.wardId } : {}),
        ...(filter.enterpriseName
          ? {
            name: {
              contains: filter.enterpriseName,
              mode: 'insensitive',
            },
          }
          : {}),
        ...(filter.taxCode
          ? {
            taxCode: {
              contains: filter.taxCode,
              mode: 'insensitive',
            },
          }
          : {}),
      };
    }

    // Thực thi song song findMany và count để tối ưu hiệu năng
    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' }, // Mặc định xếp báo cáo mới nộp lên trên
        include: {
          enterprise: {
            include: {
              businessType: true,
              businessField: true,
            },
          },
          reportPeriod: true,
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Thống kê số lượng báo cáo (Đã tiếp nhận, Đang báo cáo) gom nhóm theo từng Phường/Xã (wardId)
   */
  async getStatisticsByWard(provinceId: number, year: number, periodType?: PeriodType) {
    // 1. Lấy danh sách báo cáo khớp điều kiện
    const reports = await this.prisma.report.findMany({
      where: {
        reportPeriod: {
          year,
          ...(periodType ? { periodType } : {}),
        },
        enterprise: {
          provinceId,
          wardId: { not: null },
          status: 'APPROVED',
        },
      },
      select: {
        status: true,
        enterprise: {
          select: {
            wardId: true,
          },
        },
      },
    });

    // 2. Gom nhóm thống kê dữ liệu
    const statsMap = new Map<number, { total: number; submitted: number; draft: number }>();

    for (const r of reports) {
      const wardId = r.enterprise.wardId!;
      if (!statsMap.has(wardId)) {
        statsMap.set(wardId, { total: 0, submitted: 0, draft: 0 });
      }
      const stats = statsMap.get(wardId)!;
      stats.total++;

      if (r.status === ReportStatus.REPORTING) {
        stats.draft++;
      } else if (r.status === ReportStatus.APPROVED || r.status === ReportStatus.SUBMITTED) {
        stats.submitted++;
      }
    }

    return Array.from(statsMap.entries()).map(([wardId, stats]) => ({
      wardId,
      totalReports: stats.total,
      submittedCount: stats.submitted,
      draftCount: stats.draft,
    }));
  }

  /**
   * Lấy danh sách năm báo cáo từ min đến max trong database
   */
  async getReportYears(): Promise<number[]> {
    const result = await this.prisma.reportPeriod.aggregate({
      _min: {
        year: true,
      },
      _max: {
        year: true,
      },
    });

    const minYear = result._min.year;
    const maxYear = result._max.year;

    if (!minYear || !maxYear) {
      return [new Date().getFullYear()];
    }

    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return years;
  }
}
