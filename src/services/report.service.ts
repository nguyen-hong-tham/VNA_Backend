import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';
import { SupabaseService } from './supabase.service';
import { UpdateReportDataDto } from '../dto/report.dto';
import { CategoryType, PeriodStatus, ReportStatus, SectionType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require('pizzip');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require('docxtemplater');

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  private isPastEndDate(endDate: Date | null | undefined): boolean {
    if (!endDate) return false;
    try {
      const todayStr = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      const endStr = new Date(endDate).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      return todayStr > endStr;
    } catch {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      return today.getTime() > end.getTime();
    }
  }

  // Helper: Lấy doanh nghiệp từ userId
  private async getEnterpriseByUserId(userId: number) {
    const enterprise = await this.prisma.enterprise.findUnique({
      where: { userId },
    });
    if (!enterprise) {
      throw new NotFoundException(
        'Không tìm thấy thông tin doanh nghiệp của tài khoản này',
      );
    }
    return enterprise;
  }

  private attachTotalCost<T extends { sections?: any[] } | null | undefined>(report: T): T {
    if (!report) return report;
    report.sections?.forEach((section: any) => {
      section.totalCost =
        Number(section.medicalCost ?? 0) +
        Number(section.salaryCompensation ?? 0) +
        Number(section.compensationCost ?? 0);

      section.accidentCases?.forEach((c: any) => {
        c.totalCost =
          Number(c.medicalCost ?? 0) +
          Number(c.salaryCompensation ?? 0) +
          Number(c.compensationCost ?? 0);
      });
    });
    return report;
  }

  // 1. Lấy danh mục (dropdown cho frontend)
  async getCategories() {
    const [accidentCauses, injuryFactors, occupations, injuryTypes] =
      await Promise.all([
        this.prisma.category.findMany({
          where: { type: CategoryType.ACCIDENT_CAUSE, status: true },
          orderBy: [{ level: 'asc' }, { name: 'asc' }],
          select: { id: true, code: true, name: true, level: true, parentId: true },
        }),
        this.prisma.category.findMany({
          where: { type: CategoryType.INJURY_FACTOR, status: true },
          orderBy: [{ level: 'asc' }, { name: 'asc' }],
          select: { id: true, code: true, name: true, level: true, parentId: true },
        }),
        this.prisma.category.findMany({
          where: { type: CategoryType.OCCUPATION, status: true },
          orderBy: [{ level: 'asc' }, { name: 'asc' }],
          select: { id: true, code: true, name: true, level: true, parentId: true },
        }),
        this.prisma.category.findMany({
          where: { type: CategoryType.INJURY_TYPE, status: true },
          orderBy: [{ level: 'asc' }, { name: 'asc' }],
          select: { id: true, code: true, name: true, level: true, parentId: true },
        }),
      ]);

    return {
      accidentCauses,
      injuryFactors,
      occupations,
      injuryTypes,
    };
  }

  // 2. Lấy danh sách kỳ báo cáo và trạng thái báo cáo của doanh nghiệp
  async getPeriodsAndReports(userId: number, year?: number) {
    const enterprise = await this.getEnterpriseByUserId(userId);

    const whereClause: Record<string, unknown> = {
      status: PeriodStatus.OPEN,
    };
    if (year) {
      whereClause.year = year;
    }

    const periods = await this.prisma.reportPeriod.findMany({
      where: whereClause,
      orderBy: [{ year: 'desc' }, { periodType: 'asc' }],
    });

    // Lấy các báo cáo của doanh nghiệp cho các kỳ trên
    const periodIds = periods.map((p) => p.id);
    const reports = await this.prisma.report.findMany({
      where: {
        enterpriseId: enterprise.id,
        reportPeriodId: { in: periodIds },
      },
      select: {
        id: true,
        reportPeriodId: true,
        status: true,
        rejectReason: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    const reportMap = new Map(reports.map((r) => [r.reportPeriodId, r]));

    return periods.map((period) => ({
      period,
      report: reportMap.get(period.id) ?? null,
    }));
  }

  // 3. Khởi tạo (hoặc lấy) báo cáo cho một kỳ
  async initializeReport(userId: number, periodId: number) {
    const enterprise = await this.getEnterpriseByUserId(userId);

    // Kiểm tra kỳ báo cáo
    const period = await this.prisma.reportPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      throw new NotFoundException('Không tìm thấy kỳ báo cáo');
    }
    if (period.status !== PeriodStatus.OPEN) {
      throw new BadRequestException('Kỳ báo cáo này chưa mở hoặc đã đóng');
    }

    // Kiểm tra xem báo cáo đã tồn tại chưa
    const existing = await this.prisma.report.findUnique({
      where: {
        uq_report: {
          enterpriseId: enterprise.id,
          reportPeriodId: periodId,
        },
      },
      include: {
        reportPeriod: true,
        sections: {
          include: {
            accidentCases: {
              include: {
                accidentCause: { select: { id: true, code: true, name: true } },
                injuryFactor: { select: { id: true, code: true, name: true } },
                occupation: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (existing) {
      return this.attachTotalCost(existing);
    }

    if (this.isPastEndDate(period.endDate)) {
      throw new BadRequestException(
        'Đã quá thời hạn báo cáo, không thể khởi tạo báo cáo mới',
      );
    }

    // Tạo mới báo cáo + 2 section mặc định trong một transaction
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          enterpriseId: enterprise.id,
          reportPeriodId: periodId,
          status: ReportStatus.REPORTING,
          createdBy: userId,
        },
      });

      await tx.reportSection.createMany({
        data: [
          { reportId: report.id, sectionType: SectionType.ACCIDENT },
          { reportId: report.id, sectionType: SectionType.ALLOWANCE },
        ],
      });

      const created = await tx.report.findUnique({
        where: { id: report.id },
        include: {
          reportPeriod: true,
          sections: {
            include: {
              accidentCases: {
                include: {
                  accidentCause: { select: { id: true, code: true, name: true } },
                  injuryFactor: { select: { id: true, code: true, name: true } },
                  occupation: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
      });
      return this.attachTotalCost(created);
    });
  }

  // 4. Lấy chi tiết một báo cáo
  async getReportDetails(userId: number, reportId: number, userRole?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reportPeriod: true,
        sections: {
          include: {
            accidentCases: {
              include: {
                accidentCause: { select: { id: true, code: true, name: true } },
                injuryFactor: { select: { id: true, code: true, name: true } },
                occupation: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      const enterprise = await this.getEnterpriseByUserId(userId);
      if (report.enterpriseId !== enterprise.id) {
        throw new ForbiddenException('Bạn không có quyền truy cập báo cáo này');
      }
    }

    return this.attachTotalCost(report);
  }

  // 5. Lưu nháp báo cáo (thông tin công ty + phần tai nạn/trợ cấp)
  async updateReport(
    userId: number,
    reportId: number,
    dto: UpdateReportDataDto,
  ) {
    const enterprise = await this.getEnterpriseByUserId(userId);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { sections: true, reportPeriod: true },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    if (report.enterpriseId !== enterprise.id) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa báo cáo này');
    }

    if (
      report.status !== ReportStatus.REPORTING &&
      report.status !== ReportStatus.REJECTED // Cho phép REJECTED đối với dữ liệu lịch sử
    ) {
      throw new BadRequestException(
        'Chỉ có thể chỉnh sửa báo cáo ở trạng thái Nháp',
      );
    }

    if (this.isPastEndDate(report.reportPeriod?.endDate)) {
      throw new BadRequestException(
        'Đã quá thời hạn nộp báo cáo, không thể chỉnh sửa',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Cập nhật thông tin chính của báo cáo
      const mainUpdate: Record<string, unknown> = {};

      const finalCompanyEmployeeTotal = dto.companyEmployeeTotal !== undefined
        ? dto.companyEmployeeTotal
        : report.companyEmployeeTotal;

      const finalFemaleEmployeeTotal = dto.femaleEmployeeTotal !== undefined
        ? dto.femaleEmployeeTotal
        : report.femaleEmployeeTotal;

      const finalSalaryFund = dto.salaryFund !== undefined
        ? dto.salaryFund
        : report.salaryFund;

      if (finalCompanyEmployeeTotal <= 0) {
        throw new BadRequestException('Tổng số lao động của cơ sở phải lớn hơn 0');
      }

      if (Number(finalSalaryFund) <= 0) {
        throw new BadRequestException('Tổng quỹ lương phải lớn hơn 0');
      }

      if (finalFemaleEmployeeTotal > finalCompanyEmployeeTotal) {
        throw new BadRequestException(
          'Số lao động nữ không được lớn hơn tổng số lao động của cơ sở',
        );
      }

      if (dto.companyEmployeeTotal !== undefined)
        mainUpdate.companyEmployeeTotal = dto.companyEmployeeTotal;
      if (dto.femaleEmployeeTotal !== undefined)
        mainUpdate.femaleEmployeeTotal = dto.femaleEmployeeTotal;
      if (dto.salaryFund !== undefined) mainUpdate.salaryFund = dto.salaryFund;

      if (Object.keys(mainUpdate).length > 0) {
        await tx.report.update({
          where: { id: reportId },
          data: mainUpdate,
        });
      }

      // Helper để cập nhật một section
      const updateSection = async (
        sectionType: SectionType,
        sectionDto: typeof dto.accident | typeof dto.allowance,
      ) => {
        if (!sectionDto) return;

        const section = report.sections.find(
          (s) => s.sectionType === sectionType,
        );
        if (!section) return;

        const sectionLabel = sectionType === SectionType.ACCIDENT ? 'tai nạn' : 'trợ cấp';

        // Giá trị cuối cùng (ưu tiên dữ liệu mới truyền vào, nếu không có thì lấy dữ liệu cũ)
        const finalAccidentCount = sectionDto.accidentCount !== undefined ? sectionDto.accidentCount : section.accidentCount;
        const finalFatalAccidentCount = sectionDto.fatalAccidentCount !== undefined ? sectionDto.fatalAccidentCount : section.fatalAccidentCount;
        const finalMultiVictimAccidentCount = sectionDto.multiVictimAccidentCount !== undefined ? sectionDto.multiVictimAccidentCount : section.multiVictimAccidentCount;

        const finalVictims = sectionDto.victimCount !== undefined ? sectionDto.victimCount : section.victimCount;
        const finalFemaleVictims = sectionDto.femaleVictimCount !== undefined ? sectionDto.femaleVictimCount : section.femaleVictimCount;
        const finalDeathCount = sectionDto.deathCount !== undefined ? sectionDto.deathCount : section.deathCount;
        const finalSeverelyInjuredCount = sectionDto.severelyInjuredCount !== undefined ? sectionDto.severelyInjuredCount : section.severelyInjuredCount;

        const finalUnmanagedVictims = sectionDto.unmanagedCauseVictimCount !== undefined ? sectionDto.unmanagedCauseVictimCount : section.unmanagedCauseVictimCount;
        const finalUnmanagedFemaleVictims = sectionDto.unmanagedCauseFemaleVictimCount !== undefined ? sectionDto.unmanagedCauseFemaleVictimCount : section.unmanagedCauseFemaleVictimCount;
        const finalUnmanagedDeathCount = sectionDto.unmanagedCauseDeathCount !== undefined ? sectionDto.unmanagedCauseDeathCount : section.unmanagedCauseDeathCount;
        const finalUnmanagedSeverelyInjuredCount = sectionDto.unmanagedCauseSeverelyInjuredCount !== undefined ? sectionDto.unmanagedCauseSeverelyInjuredCount : section.unmanagedCauseSeverelyInjuredCount;

        const finalMedicalCost = sectionDto.medicalCost !== undefined ? sectionDto.medicalCost : section.medicalCost;
        const finalSalaryCompensation = sectionDto.salaryCompensation !== undefined ? sectionDto.salaryCompensation : section.salaryCompensation;
        const finalCompensationCost = sectionDto.compensationCost !== undefined ? sectionDto.compensationCost : section.compensationCost;
        const finalAssetDamage = sectionDto.assetDamage !== undefined ? sectionDto.assetDamage : section.assetDamage;
        const finalDaysLost = sectionDto.daysLost !== undefined ? sectionDto.daysLost : section.daysLost;

        // (0) Có nhập tổng số vụ thì bắt buộc có số người bị nạn
        if (finalAccidentCount > 0 && finalVictims === 0) {
          throw new BadRequestException(
            `Có nhập tổng số vụ (${finalAccidentCount}) thì bắt buộc phải có nhập tổng số người bị nạn lớn hơn 0 trong phần ${sectionLabel}`,
          );
        }

        // (1) Số vụ chết người & số vụ có 2 người bị nạn trở lên <= tổng số vụ
        if (finalFatalAccidentCount > finalAccidentCount) {
          throw new BadRequestException(
            `Số vụ tai nạn chết người (${finalFatalAccidentCount}) không được lớn hơn tổng số vụ tai nạn (${finalAccidentCount}) trong phần ${sectionLabel}`,
          );
        }
        if (finalMultiVictimAccidentCount > finalAccidentCount) {
          throw new BadRequestException(
            `Số vụ tai nạn có 2 người bị nạn trở lên (${finalMultiVictimAccidentCount}) không được lớn hơn tổng số vụ tai nạn (${finalAccidentCount}) trong phần ${sectionLabel}`,
          );
        }

        // (2) Lao động nữ bị nạn, số người chết, số người bị thương nặng <= tổng số người bị nạn
        if (finalFemaleVictims > finalVictims) {
          throw new BadRequestException(
            `Số lao động nữ bị nạn (${finalFemaleVictims}) không được lớn hơn tổng số người bị nạn (${finalVictims}) trong phần ${sectionLabel}`,
          );
        }
        if (finalDeathCount > finalVictims) {
          throw new BadRequestException(
            `Số người chết (${finalDeathCount}) không được lớn hơn tổng số người bị nạn (${finalVictims}) trong phần ${sectionLabel}`,
          );
        }
        if (finalSeverelyInjuredCount > finalVictims) {
          throw new BadRequestException(
            `Số người bị thương nặng (${finalSeverelyInjuredCount}) không được lớn hơn tổng số người bị nạn (${finalVictims}) trong phần ${sectionLabel}`,
          );
        }

        // (3) Lao động nữ / số chết / thương nặng KHÔNG QL <= số người bị nạn KHÔNG QL
        if (finalUnmanagedFemaleVictims > finalUnmanagedVictims) {
          throw new BadRequestException(
            `Số lao động nữ bị nạn không quản lý (${finalUnmanagedFemaleVictims}) không được lớn hơn tổng số người bị nạn không quản lý (${finalUnmanagedVictims}) trong phần ${sectionLabel}`,
          );
        }
        if (finalUnmanagedDeathCount > finalUnmanagedVictims) {
          throw new BadRequestException(
            `Số người chết không quản lý (${finalUnmanagedDeathCount}) không được lớn hơn tổng số người bị nạn không quản lý (${finalUnmanagedVictims}) trong phần ${sectionLabel}`,
          );
        }
        if (finalUnmanagedSeverelyInjuredCount > finalUnmanagedVictims) {
          throw new BadRequestException(
            `Số người bị thương nặng không quản lý (${finalUnmanagedSeverelyInjuredCount}) không được lớn hơn tổng số người bị nạn không quản lý (${finalUnmanagedVictims}) trong phần ${sectionLabel}`,
          );
        }

        // (5) Tổng của các trường từ chi tiết phải bằng tổng số đã khai báo
        if (sectionDto.accidentCases !== undefined) {
          const sumAccidentCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.accidentCount ?? 0), 0);
          const sumVictimCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.victimCount ?? 0), 0);
          const sumUnmanagedVictims = sectionDto.accidentCases.reduce((sum, c) => sum + (c.unmanagedCauseVictimCount ?? 0), 0);
          const sumMedicalCost = sectionDto.accidentCases.reduce((sum, c) => sum + (Number(c.medicalCost) || 0), 0);
          const sumSalaryCompensation = sectionDto.accidentCases.reduce((sum, c) => sum + (Number(c.salaryCompensation) || 0), 0);
          const sumCompensationCost = sectionDto.accidentCases.reduce((sum, c) => sum + (Number(c.compensationCost) || 0), 0);
          const sumAssetDamage = sectionDto.accidentCases.reduce((sum, c) => sum + (Number(c.assetDamage) || 0), 0);

          const sumFatalAccidentCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.fatalAccidentCount ?? 0), 0);
          const sumMultiVictimAccidentCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.multiVictimAccidentCount ?? 0), 0);
          const sumFemaleVictims = sectionDto.accidentCases.reduce((sum, c) => sum + (c.femaleVictimCount ?? 0), 0);
          const sumDeathCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.deathCount ?? 0), 0);
          const sumSeverelyInjuredCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.severelyInjuredCount ?? 0), 0);
          const sumUnmanagedFemaleVictims = sectionDto.accidentCases.reduce((sum, c) => sum + (c.unmanagedCauseFemaleVictimCount ?? 0), 0);
          const sumUnmanagedDeathCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.unmanagedCauseDeathCount ?? 0), 0);
          const sumUnmanagedSeverelyInjuredCount = sectionDto.accidentCases.reduce((sum, c) => sum + (c.unmanagedCauseSeverelyInjuredCount ?? 0), 0);
          const sumDaysLost = sectionDto.accidentCases.reduce((sum, c) => sum + (c.daysLost ?? 0), 0);

          if (sumAccidentCount !== finalAccidentCount) {
            throw new BadRequestException(
              `Tổng số vụ từ các chi tiết (${sumAccidentCount}) phải bằng tổng số vụ đã khai (${finalAccidentCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumVictimCount !== finalVictims) {
            throw new BadRequestException(
              `Tổng số người bị nạn từ các chi tiết (${sumVictimCount}) phải bằng tổng số người bị nạn đã khai (${finalVictims}) trong phần ${sectionLabel}`,
            );
          }
          if (sumUnmanagedVictims !== finalUnmanagedVictims) {
            throw new BadRequestException(
              `Tổng số người bị nạn không quản lý từ các chi tiết (${sumUnmanagedVictims}) phải bằng tổng số người bị nạn không quản lý đã khai (${finalUnmanagedVictims}) trong phần ${sectionLabel}`,
            );
          }
          if (sumMedicalCost !== Number(finalMedicalCost || 0)) {
            throw new BadRequestException(
              `Tổng chi phí y tế từ các chi tiết (${sumMedicalCost}) phải bằng chi phí y tế đã khai (${finalMedicalCost}) trong phần ${sectionLabel}`,
            );
          }
          if (sumSalaryCompensation !== Number(finalSalaryCompensation || 0)) {
            throw new BadRequestException(
              `Tổng trả lương y tế từ các chi tiết (${sumSalaryCompensation}) phải bằng trả lương y tế đã khai (${finalSalaryCompensation}) trong phần ${sectionLabel}`,
            );
          }
          if (sumCompensationCost !== Number(finalCompensationCost || 0)) {
            throw new BadRequestException(
              `Tổng bồi thường/trợ cấp từ các chi tiết (${sumCompensationCost}) phải bằng bồi thường/trợ cấp đã khai (${finalCompensationCost}) trong phần ${sectionLabel}`,
            );
          }
          if (sumAssetDamage !== Number(finalAssetDamage || 0)) {
            throw new BadRequestException(
              `Tổng thiệt hại tài sản từ các chi tiết (${sumAssetDamage}) phải bằng thiệt hại tài sản đã khai (${finalAssetDamage}) trong phần ${sectionLabel}`,
            );
          }
          if (sumFatalAccidentCount !== finalFatalAccidentCount) {
            throw new BadRequestException(
              `Tổng số vụ có người chết từ các chi tiết (${sumFatalAccidentCount}) phải bằng số vụ có người chết đã khai (${finalFatalAccidentCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumMultiVictimAccidentCount !== finalMultiVictimAccidentCount) {
            throw new BadRequestException(
              `Tổng số vụ có 2 người bị nạn trở lên từ các chi tiết (${sumMultiVictimAccidentCount}) phải bằng số vụ tương ứng đã khai (${finalMultiVictimAccidentCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumFemaleVictims !== finalFemaleVictims) {
            throw new BadRequestException(
              `Tổng số lao động nữ bị nạn từ các chi tiết (${sumFemaleVictims}) phải bằng số lao động nữ bị nạn đã khai (${finalFemaleVictims}) trong phần ${sectionLabel}`,
            );
          }
          if (sumDeathCount !== finalDeathCount) {
            throw new BadRequestException(
              `Tổng số người chết từ các chi tiết (${sumDeathCount}) phải bằng số người chết đã khai (${finalDeathCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumSeverelyInjuredCount !== finalSeverelyInjuredCount) {
            throw new BadRequestException(
              `Tổng số người bị thương nặng từ các chi tiết (${sumSeverelyInjuredCount}) phải bằng số người bị thương nặng đã khai (${finalSeverelyInjuredCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumUnmanagedFemaleVictims !== finalUnmanagedFemaleVictims) {
            throw new BadRequestException(
              `Tổng lao động nữ bị nạn không quản lý từ các chi tiết (${sumUnmanagedFemaleVictims}) phải bằng con số tương ứng đã khai (${finalUnmanagedFemaleVictims}) trong phần ${sectionLabel}`,
            );
          }
          if (sumUnmanagedDeathCount !== finalUnmanagedDeathCount) {
            throw new BadRequestException(
              `Tổng số người chết không quản lý từ các chi tiết (${sumUnmanagedDeathCount}) phải bằng con số tương ứng đã khai (${finalUnmanagedDeathCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumUnmanagedSeverelyInjuredCount !== finalUnmanagedSeverelyInjuredCount) {
            throw new BadRequestException(
              `Tổng số người bị thương nặng không quản lý từ các chi tiết (${sumUnmanagedSeverelyInjuredCount}) phải bằng con số tương ứng đã khai (${finalUnmanagedSeverelyInjuredCount}) trong phần ${sectionLabel}`,
            );
          }
          if (sumDaysLost !== finalDaysLost) {
            throw new BadRequestException(
              `Tổng số ngày nghỉ từ các chi tiết (${sumDaysLost}) phải bằng tổng số ngày nghỉ đã khai (${finalDaysLost}) trong phần ${sectionLabel}`,
            );
          }
        }

        // Cập nhật aggregate
        const sectionUpdate: Record<string, unknown> = {};
        if (sectionDto.accidentCount !== undefined)
          sectionUpdate.accidentCount = sectionDto.accidentCount;
        if (sectionDto.fatalAccidentCount !== undefined)
          sectionUpdate.fatalAccidentCount = sectionDto.fatalAccidentCount;
        if (sectionDto.multiVictimAccidentCount !== undefined)
          sectionUpdate.multiVictimAccidentCount =
            sectionDto.multiVictimAccidentCount;
        if (sectionDto.victimCount !== undefined)
          sectionUpdate.victimCount = sectionDto.victimCount;
        if (sectionDto.unmanagedCauseVictimCount !== undefined)
          sectionUpdate.unmanagedCauseVictimCount =
            sectionDto.unmanagedCauseVictimCount;
        if (sectionDto.femaleVictimCount !== undefined)
          sectionUpdate.femaleVictimCount = sectionDto.femaleVictimCount;
        if (sectionDto.unmanagedCauseFemaleVictimCount !== undefined)
          sectionUpdate.unmanagedCauseFemaleVictimCount =
            sectionDto.unmanagedCauseFemaleVictimCount;
        if (sectionDto.deathCount !== undefined)
          sectionUpdate.deathCount = sectionDto.deathCount;
        if (sectionDto.unmanagedCauseDeathCount !== undefined)
          sectionUpdate.unmanagedCauseDeathCount =
            sectionDto.unmanagedCauseDeathCount;
        if (sectionDto.severelyInjuredCount !== undefined)
          sectionUpdate.severelyInjuredCount = sectionDto.severelyInjuredCount;
        if (sectionDto.unmanagedCauseSeverelyInjuredCount !== undefined)
          sectionUpdate.unmanagedCauseSeverelyInjuredCount =
            sectionDto.unmanagedCauseSeverelyInjuredCount;
        if (sectionDto.medicalCost !== undefined)
          sectionUpdate.medicalCost = sectionDto.medicalCost;
        if (sectionDto.salaryCompensation !== undefined)
          sectionUpdate.salaryCompensation = sectionDto.salaryCompensation;
        if (sectionDto.compensationCost !== undefined)
          sectionUpdate.compensationCost = sectionDto.compensationCost;
        if (sectionDto.assetDamage !== undefined)
          sectionUpdate.assetDamage = sectionDto.assetDamage;
        if (sectionDto.daysLost !== undefined)
          sectionUpdate.daysLost = sectionDto.daysLost;

        if (Object.keys(sectionUpdate).length > 0) {
          await tx.reportSection.update({
            where: { id: section.id },
            data: sectionUpdate,
          });
        }

        // Xoá và tạo lại accident cases nếu có truyền vào
        if (sectionDto.accidentCases !== undefined) {
          for (const c of sectionDto.accidentCases) {
            const accCount = c.accidentCount ?? 0;
            const vic = c.victimCount ?? 0;

            if (accCount > 0 && vic === 0) {
              throw new BadRequestException(
                `Có nhập tổng số vụ (${accCount}) thì bắt buộc phải có nhập tổng số người bị nạn lớn hơn 0 trong chi tiết vụ tai nạn`,
              );
            }

            const fatalAcc = c.fatalAccidentCount ?? 0;
            const multiAcc = c.multiVictimAccidentCount ?? 0;
            if (fatalAcc > accCount) {
              throw new BadRequestException(
                `Số vụ tai nạn chết người (${fatalAcc}) trong vụ tai nạn chi tiết không được lớn hơn tổng số vụ của chi tiết đó (${accCount})`,
              );
            }
            if (multiAcc > accCount) {
              throw new BadRequestException(
                `Số vụ tai nạn có 2 người bị nạn trở lên (${multiAcc}) trong vụ tai nạn chi tiết không được lớn hơn tổng số vụ của chi tiết đó (${accCount})`,
              );
            }

            const vicCount = c.victimCount ?? 0;
            const femVic = c.femaleVictimCount ?? 0;
            const deathVic = c.deathCount ?? 0;
            const severeVic = c.severelyInjuredCount ?? 0;
            if (femVic > vicCount) {
              throw new BadRequestException(
                `Số lao động nữ bị nạn (${femVic}) trong vụ tai nạn chi tiết không được lớn hơn tổng số người bị nạn của vụ đó (${vicCount})`,
              );
            }
            if (deathVic > vicCount) {
              throw new BadRequestException(
                `Số người chết (${deathVic}) trong vụ tai nạn chi tiết không được lớn hơn tổng số người bị nạn của vụ đó (${vicCount})`,
              );
            }
            if (severeVic > vicCount) {
              throw new BadRequestException(
                `Số người bị thương nặng (${severeVic}) trong vụ tai nạn chi tiết không được lớn hơn tổng số người bị nạn của vụ đó (${vicCount})`,
              );
            }

            const unmanagedVic = c.unmanagedCauseVictimCount ?? 0;
            const unmanagedFemVic = c.unmanagedCauseFemaleVictimCount ?? 0;
            const unmanagedDeathVic = c.unmanagedCauseDeathCount ?? 0;
            const unmanagedSevereVic = c.unmanagedCauseSeverelyInjuredCount ?? 0;
            if (unmanagedFemVic > unmanagedVic) {
              throw new BadRequestException(
                `Số lao động nữ bị nạn không quản lý (${unmanagedFemVic}) trong vụ tai nạn chi tiết không được lớn hơn số người bị nạn không quản lý của vụ đó (${unmanagedVic})`,
              );
            }
            if (unmanagedDeathVic > unmanagedVic) {
              throw new BadRequestException(
                `Số người chết không quản lý (${unmanagedDeathVic}) trong vụ tai nạn chi tiết không được lớn hơn số người bị nạn không quản lý của vụ đó (${unmanagedVic})`,
              );
            }
            if (unmanagedSevereVic > unmanagedVic) {
              throw new BadRequestException(
                `Số người bị thương nặng không quản lý (${unmanagedSevereVic}) trong vụ tai nạn chi tiết không được lớn hơn số người bị nạn không quản lý của vụ đó (${unmanagedVic})`,
              );
            }
          }

          await tx.reportAccidentCase.deleteMany({
            where: { reportSectionId: section.id },
          });

          if (sectionDto.accidentCases.length > 0) {
            await tx.reportAccidentCase.createMany({
              data: sectionDto.accidentCases.map((c) => ({
                reportSectionId: section.id,
                accidentCauseId: c.accidentCauseId || null,
                injuryFactorId: c.injuryFactorId || null,
                occupationId: c.occupationId || null,
                accidentCount: c.accidentCount ?? 0,
                fatalAccidentCount: c.fatalAccidentCount ?? 0,
                multiVictimAccidentCount: c.multiVictimAccidentCount ?? 0,
                victimCount: c.victimCount ?? 0,
                unmanagedCauseVictimCount: c.unmanagedCauseVictimCount ?? 0,
                femaleVictimCount: c.femaleVictimCount ?? 0,
                unmanagedCauseFemaleVictimCount:
                  c.unmanagedCauseFemaleVictimCount ?? 0,
                deathCount: c.deathCount ?? 0,
                unmanagedCauseDeathCount: c.unmanagedCauseDeathCount ?? 0,
                severelyInjuredCount: c.severelyInjuredCount ?? 0,
                unmanagedCauseSeverelyInjuredCount:
                  c.unmanagedCauseSeverelyInjuredCount ?? 0,
                medicalCost: c.medicalCost ?? 0,
                salaryCompensation: c.salaryCompensation ?? 0,
                compensationCost: c.compensationCost ?? 0,
                assetDamage: c.assetDamage ?? 0,
                daysLost: c.daysLost ?? 0,
              })),
            });
          }
        }
      };

      await updateSection(SectionType.ACCIDENT, dto.accident);
      await updateSection(SectionType.ALLOWANCE, dto.allowance);
    });

    return this.getReportDetails(userId, reportId);
  }

  // 6. Nộp báo cáo
  async submitReport(userId: number, reportId: number) {
    const enterprise = await this.getEnterpriseByUserId(userId);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { reportPeriod: true },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    if (report.enterpriseId !== enterprise.id) {
      throw new ForbiddenException('Bạn không có quyền nộp báo cáo này');
    }

    if (
      report.status !== ReportStatus.REPORTING &&
      report.status !== ReportStatus.REJECTED // Cho phép REJECTED đối với dữ liệu lịch sử
    ) {
      throw new BadRequestException(
        'Chỉ có thể nộp báo cáo ở trạng thái Nháp',
      );
    }

    if (this.isPastEndDate(report.reportPeriod?.endDate)) {
      throw new BadRequestException(
        'Đã quá thời hạn nộp báo cáo, không thể nộp',
      );
    }

    if (!report.attachedFilePath) {
      throw new BadRequestException(
        'Vui lòng đính kèm file báo cáo có dấu mộc trước khi nộp',
      );
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(),
        rejectReason: null,
      },
    });

    return { message: 'Nộp báo cáo thành công' };
  }

  // 7. Tải lên file báo cáo có dấu
  async uploadStampedFile(
    userId: number,
    reportId: number,
    file: Express.Multer.File,
  ) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Chỉ chấp nhận đính kèm file định dạng PDF');
    }

    const enterprise = await this.getEnterpriseByUserId(userId);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { reportPeriod: true },
    });

    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    if (report.enterpriseId !== enterprise.id) {
      throw new ForbiddenException(
        'Bạn không có quyền tải file cho báo cáo này',
      );
    }

    if (
      report.status !== ReportStatus.REPORTING &&
      report.status !== ReportStatus.REJECTED // Cho phép REJECTED đối với dữ liệu lịch sử
    ) {
      throw new BadRequestException(
        'Chỉ có thể tải file báo cáo ở trạng thái Nháp',
      );
    }

    if (this.isPastEndDate(report.reportPeriod?.endDate)) {
      throw new BadRequestException(
        'Đã quá thời hạn nộp báo cáo, không thể tải file',
      );
    }

    const identifier = `report-${reportId}`;
    const uploaded = await this.supabaseService.uploadFile(
      file,
      identifier,
      'reports',
    );

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        attachedFileName: uploaded.fileName,
        attachedFilePath: uploaded.url,
      },
    });

    return {
      message: 'Tải file báo cáo thành công',
      fileName: uploaded.fileName,
      filePath: uploaded.url,
    };
  }

  // 8. Xuất báo cáo ra file Word
  async exportWordReport(userId: number, reportId: number, userRole?: string): Promise<{ buffer: Buffer; fileName: string }> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reportPeriod: true,
        enterprise: {
          include: {
            businessType: true,
            businessField: true,
          },
        },
        sections: {
          include: {
            accidentCases: {
              include: {
                accidentCause: { select: { id: true, code: true, name: true } },
                injuryFactor: { select: { id: true, code: true, name: true } },
                occupation: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');

    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      const enterprise = await this.getEnterpriseByUserId(userId);
      if (report.enterpriseId !== enterprise.id) throw new ForbiddenException('Bạn không có quyền xuất báo cáo này');
    }

    const accSection = report.sections.find(s => s.sectionType === SectionType.ACCIDENT);
    const allwSection = report.sections.find(s => s.sectionType === SectionType.ALLOWANCE);

    const fmt = (v: number | null | undefined) => (v ?? 0).toLocaleString('vi-VN');
    const fmtNum = (v: number | null | undefined) => String(v ?? 0);

    // Chi tiết vụ TNLD — phân theo nguyên nhân
    const accCases = accSection?.accidentCases ?? [];

    // Hàm hỗ trợ gom nhóm theo ID để lấy cả tên và mã
    const groupBy = (getCat: (c: typeof accCases[0]) => { id?: number; code?: string; name?: string } | null | undefined) => {
      const groups = new Map<number | string, any>();
      for (const c of accCases) {
        const cat = getCat(c);
        const key = cat?.id ?? cat?.name ?? 'Khác';
        if (!groups.has(key)) {
          groups.set(key, { ...c, key, ma_so: cat?.code ?? '', ten_chi_tieu: cat?.name ?? 'Khác', accidentCount: 0, fatalAccidentCount: 0, multiVictimAccidentCount: 0, victimCount: 0, unmanagedCauseVictimCount: 0, femaleVictimCount: 0, unmanagedCauseFemaleVictimCount: 0, deathCount: 0, unmanagedCauseDeathCount: 0, severelyInjuredCount: 0, unmanagedCauseSeverelyInjuredCount: 0, medicalCost: 0, salaryCompensation: 0, compensationCost: 0, assetDamage: 0, daysLost: 0 });
        }
        const g = groups.get(key)!;
        g.accidentCount += c.accidentCount;
        g.fatalAccidentCount += c.fatalAccidentCount;
        g.multiVictimAccidentCount += c.multiVictimAccidentCount;
        g.victimCount += c.victimCount;
        g.unmanagedCauseVictimCount += c.unmanagedCauseVictimCount;
        g.femaleVictimCount += c.femaleVictimCount;
        g.unmanagedCauseFemaleVictimCount += c.unmanagedCauseFemaleVictimCount;
        g.deathCount += c.deathCount;
        g.unmanagedCauseDeathCount += c.unmanagedCauseDeathCount;
        g.severelyInjuredCount += c.severelyInjuredCount;
        g.unmanagedCauseSeverelyInjuredCount += c.unmanagedCauseSeverelyInjuredCount;
        g.medicalCost = Number(g.medicalCost) + Number(c.medicalCost);
        g.salaryCompensation = Number(g.salaryCompensation) + Number(c.salaryCompensation);
        g.compensationCost = Number(g.compensationCost) + Number(c.compensationCost);
        g.assetDamage = Number(g.assetDamage) + Number(c.assetDamage);
        g.daysLost += c.daysLost;
      }
      return Array.from(groups.values()).map((g, idx) => ({
        stt: idx + 1,
        ten_chi_tieu: g.ten_chi_tieu,
        ma_so: g.ma_so,
        so_vu: fmtNum(g.accidentCount),
        so_vu_chet: fmtNum(g.fatalAccidentCount),
        so_vu_2nn: fmtNum(g.multiVictimAccidentCount),
        so_nn: fmtNum(g.victimCount),
        nn_khong_ql: fmtNum(g.unmanagedCauseVictimCount),
        nu_bi_nan: fmtNum(g.femaleVictimCount),
        nu_khong_ql: fmtNum(g.unmanagedCauseFemaleVictimCount),
        so_chet: fmtNum(g.deathCount),
        chet_khong_ql: fmtNum(g.unmanagedCauseDeathCount),
        thuong_nang: fmtNum(g.severelyInjuredCount),
        thuong_nang_khong_ql: fmtNum(g.unmanagedCauseSeverelyInjuredCount),
        chi_phi_yt: fmt(g.medicalCost),
        chi_phi_luong: fmt(g.salaryCompensation),
        boi_thuong: fmt(g.compensationCost),
        thiet_hai_ts: fmt(g.assetDamage),
        ngay_nghi: fmtNum(g.daysLost),
      }));
    };

    const caseRows = groupBy(c => c.accidentCause);
    const factorRows = groupBy(c => c.injuryFactor);
    const occRows = groupBy(c => c.occupation);

    const periodYear = report.reportPeriod?.year ?? new Date().getFullYear();
    const periodType = report.reportPeriod?.periodType === 'HALF_YEAR' ? 'Kỳ I' : 'Cả năm';

    const getSectionField = (section: Record<string, unknown> | undefined, field: string): number =>
      Number(section?.[field] ?? 0);
    const accTotal = (field: string) => getSectionField(accSection as Record<string, unknown>, field);
    const allwTotal = (field: string) => getSectionField(allwSection as Record<string, unknown>, field);

    const data = {
      // Thông tin chung
      ten_dn: report.enterprise?.name ?? '',
      dia_chi: report.enterprise?.operatingAddress || report.enterprise?.registeredAddress || '',
      ma_huyen: '', // Hiện tại DB không lưu mã huyện 4 số riêng biệt
      nam: String(periodYear),
      ky_bao_cao: periodType,
      loai_hinh: report.enterprise?.businessType?.name ?? '',
      ma_loai_hinh: report.enterprise?.businessType?.code ?? '',
      linh_vuc: report.enterprise?.businessField?.name ?? '',
      ma_linh_vuc: report.enterprise?.businessField?.code ?? '',

      // Thông tin lao động
      tong_lao_dong: fmtNum(report.companyEmployeeTotal),
      lao_dong_nu: fmtNum(report.femaleEmployeeTotal),
      quy_luong: fmt(Number(report.salaryFund)),

      // Tổng quan TNLD
      tnld_so_vu: fmtNum(accTotal('accidentCount')),
      tnld_so_vu_chet: fmtNum(accTotal('fatalAccidentCount')),
      tnld_so_vu_2nn: fmtNum(accTotal('multiVictimAccidentCount')),
      tnld_so_nn: fmtNum(accTotal('victimCount')),
      tnld_nn_khong_ql: fmtNum(accTotal('unmanagedCauseVictimCount')),
      tnld_nu_bi_nan: fmtNum(accTotal('femaleVictimCount')),
      tnld_nu_khong_ql: fmtNum(accTotal('unmanagedCauseFemaleVictimCount')),
      tnld_so_chet: fmtNum(accTotal('deathCount')),
      tnld_chet_khong_ql: fmtNum(accTotal('unmanagedCauseDeathCount')),
      tnld_thuong_nang: fmtNum(accTotal('severelyInjuredCount')),
      tnld_thuong_nang_khong_ql: fmtNum(accTotal('unmanagedCauseSeverelyInjuredCount')),
      tnld_chi_phi_yt: fmt(accTotal('medicalCost')),
      tnld_chi_phi_luong: fmt(accTotal('salaryCompensation')),
      tnld_boi_thuong: fmt(accTotal('compensationCost')),
      tnld_tong_chi_phi: fmt(accTotal('medicalCost') + accTotal('salaryCompensation') + accTotal('compensationCost')),
      tnld_thiet_hai_ts: fmt(accTotal('assetDamage')),
      tnld_ngay_nghi: fmtNum(accTotal('daysLost')),

      // Trợ cấp (K2Đ39)
      tc_so_vu: fmtNum(allwTotal('accidentCount')),
      tc_so_vu_chet: fmtNum(allwTotal('fatalAccidentCount')),
      tc_so_vu_2nn: fmtNum(allwTotal('multiVictimAccidentCount')),
      tc_so_nn: fmtNum(allwTotal('victimCount')),
      tc_nn_khong_ql: fmtNum(allwTotal('unmanagedCauseVictimCount')),
      tc_nu_bi_nan: fmtNum(allwTotal('femaleVictimCount')),
      tc_nu_khong_ql: fmtNum(allwTotal('unmanagedCauseFemaleVictimCount')),
      tc_so_chet: fmtNum(allwTotal('deathCount')),
      tc_chet_khong_ql: fmtNum(allwTotal('unmanagedCauseDeathCount')),
      tc_thuong_nang: fmtNum(allwTotal('severelyInjuredCount')),
      tc_thuong_nang_khong_ql: fmtNum(allwTotal('unmanagedCauseSeverelyInjuredCount')),
      tc_chi_phi_yt: fmt(allwTotal('medicalCost')),
      tc_chi_phi_luong: fmt(allwTotal('salaryCompensation')),
      tc_boi_thuong: fmt(allwTotal('compensationCost')),
      tc_tong_chi_phi: fmt(allwTotal('medicalCost') + allwTotal('salaryCompensation') + allwTotal('compensationCost')),
      tc_thiet_hai_ts: fmt(allwTotal('assetDamage')),
      tc_ngay_nghi: fmtNum(allwTotal('daysLost')),

      // Tổng số (3=1+2) (ts_)
      ts_so_vu: fmtNum(accTotal('accidentCount') + allwTotal('accidentCount')),
      ts_so_vu_chet: fmtNum(accTotal('fatalAccidentCount') + allwTotal('fatalAccidentCount')),
      ts_so_vu_2nn: fmtNum(accTotal('multiVictimAccidentCount') + allwTotal('multiVictimAccidentCount')),
      ts_so_nn: fmtNum(accTotal('victimCount') + allwTotal('victimCount')),
      ts_nn_khong_ql: fmtNum(accTotal('unmanagedCauseVictimCount') + allwTotal('unmanagedCauseVictimCount')),
      ts_nu_bi_nan: fmtNum(accTotal('femaleVictimCount') + allwTotal('femaleVictimCount')),
      ts_nu_khong_ql: fmtNum(accTotal('unmanagedCauseFemaleVictimCount') + allwTotal('unmanagedCauseFemaleVictimCount')),
      ts_so_chet: fmtNum(accTotal('deathCount') + allwTotal('deathCount')),
      ts_chet_khong_ql: fmtNum(accTotal('unmanagedCauseDeathCount') + allwTotal('unmanagedCauseDeathCount')),
      ts_thuong_nang: fmtNum(accTotal('severelyInjuredCount') + allwTotal('severelyInjuredCount')),
      ts_thuong_nang_khong_ql: fmtNum(accTotal('unmanagedCauseSeverelyInjuredCount') + allwTotal('unmanagedCauseSeverelyInjuredCount')),

      // Chi tiết vụ tai nạn (loop)
      chi_tiet: caseRows,
      chi_tiet_yeu_to: factorRows,
      chi_tiet_nghe: occRows,
    };

    const templatePath = path.join(process.cwd(), 'template_BC_TNLD.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    const fileName = `BC_TNLD_${report.enterprise?.name ?? 'doanh-nghiep'}_${periodYear}.docx`
      .replace(/[\s/\\:*?"<>|]/g, '_');

    return { buffer: buf, fileName };
  }

  async getRejectionNotificationsByEnterprise(enterpriseId: number) {
    return this.prisma.report.findMany({
      where: {
        enterpriseId,
        status: { in: [ReportStatus.REPORTING, ReportStatus.REJECTED] }, // Bao gồm REJECTED đối với dữ liệu lịch sử
        rejectReason: { not: null },
      },
      select: {
        id: true,
        enterpriseId: true,
        rejectReason: true,
        submittedAt: true,
        updatedAt: true,
        reportPeriod: {
          select: {
            id: true,
            reportName: true,
            year: true,
            periodType: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
