import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PeriodType, ReportStatus } from '@prisma/client';
import { DepartmentReportRepository } from '../repositories/department-report.repository';
import { QueryDepartmentReportDto } from '../dto/report_department/query-department-report.dto';
import { PrismaService } from '../repositories/prisma.service';
import { MailService } from './mail.service';
import { BulkApproveDto } from '../dto/report_department/bulk-approve.dto';
import { BulkRejectDto } from '../dto/report_department/bulk-reject.dto';

@Injectable()
export class DepartmentReportService {
  constructor(
    private readonly reportRepo: DepartmentReportRepository,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

  // hàm duyệt hàng loạt
  async bulkApprove(dto: BulkApproveDto) {
    const { reportIds } = dto;

    return this.prisma.$transaction(async (tx) => {
      // kieemr tra sự tồn tại của các báo cáo và trạng thái
      const reports = await tx.report.findMany({
        where: { id: { in: reportIds } }
      })

      if (reports.length !== reportIds.length) {
        throw new NotFoundException('Một hoặc nhiều báo cáo không tồn tại trong hệ thống');
      }

      // Chỉ cho phép duyệt những báo cáo đang ở trạng thái SUBMITTED (Chờ tiếp nhận)
      const invalidReports = reports.filter(r => r.status !== ReportStatus.SUBMITTED);
      if (invalidReports.length > 0) {
        throw new BadRequestException(`Chỉ có thể phê duyệt báo cáo ở trạng thái Chờ tiếp nhận. Các ID lỗi: ${invalidReports.map(r => r.id).join(', ')}`);
      }

      // cập nhật trạng thái thành approved
      await tx.report.updateMany({
        where: { id: { in: reportIds } },
        data: {
          status: ReportStatus.APPROVED,
          rejectReason: null, // Xóa lý do từ chối cũ nếu có
        },
      });

      return {
        message: `Duyệt báo cáo thành công ${reportIds.length} báo cáo`,
        success: true,
      }


    })

  }
  // HÀM TỪ CHỐI HÀNG LOẠT & GỬI EMAIL
  async bulkReject(dto: BulkRejectDto) {
    const { rejectItems } = dto;
    const reportIds = rejectItems.map(item => item.reportId);

    // Chạy transaction để cập nhật trạng thái báo cáo
    const processedReports = await this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra sự tồn tại
      const reports = await tx.report.findMany({
        where: { id: { in: reportIds } },
        include: {
          enterprise: true,
          reportPeriod: true,
        }
      });

      if (reports.length !== reportIds.length) {
        throw new NotFoundException('Một hoặc nhiều báo cáo không tồn tại trong hệ thống');
      }

      // Chỉ từ chối các báo cáo có trạng thái SUBMITTED
      const invalidReports = reports.filter(r => r.status !== ReportStatus.SUBMITTED);
      if (invalidReports.length > 0) {
        throw new BadRequestException(`Chỉ có thể từ chối các báo cáo đang ở trạng thái Chờ tiếp nhận. Các ID lỗi: ${invalidReports.map(r => r.id).join(', ')}`);
      }

      // 2. Cập nhật từng báo cáo với lý do tương ứng
      for (const item of rejectItems) {
        await tx.report.update({
          where: { id: item.reportId },
          data: {
            status: ReportStatus.REJECTED,
            rejectReason: item.note,
          }
        });
      }

      return reports; // Trả về thông tin để gửi email ở bước sau
    });

    // 3. Gửi email thông báo (Không chạy trong transaction để tránh nghẽn DB nếu gửi email chậm)
    for (const report of processedReports) {
      const rejectConfig = rejectItems.find(item => item.reportId === report.id);
      
      // Lấy email doanh nghiệp (chỉ lấy email riêng của Enterprise, không lấy email của User quản trị)
      const targetEmail = report.enterprise.email;
      
      // Lấy hạn chót nộp báo cáo (EndDate)
      const rawEndDate = report.reportPeriod.endDate;
      const formattedEndDate = rawEndDate 
        ? new Date(rawEndDate).toLocaleDateString('vi-VN') 
        : 'Không xác định';

      if (targetEmail) {
        console.log(`[Email Notification] Đang gửi email từ chối đến Doanh nghiệp: "${report.enterprise.name}" (ID: ${report.enterpriseId}) | Email nhận: "${targetEmail}" | Lý do: "${rejectConfig?.note || ''}"`);
        // Gửi email bất đồng bộ (chạy ngầm, không dùng await đồng bộ để tránh làm chậm phản hồi API)
        this.mailService.sendReportRejectionEmail(
          targetEmail,
          report.enterprise.name,
          report.enterpriseId,
          rejectConfig?.note || '',
          formattedEndDate,
        ).catch(err => {
          console.error(`Lỗi gửi email cho doanh nghiệp ID ${report.enterpriseId}:`, err);
        });
      } else {
        console.warn(`[Email Notification] Bỏ qua gửi email. Doanh nghiệp: "${report.enterprise.name}" (ID: ${report.enterpriseId}) KHÔNG cấu hình địa chỉ email doanh nghiệp.`);
      }
    }

    return {
      message: `Đã từ chối thành công ${rejectItems.length} báo cáo và gửi email thông báo`,
      success: true,
    };
  }

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