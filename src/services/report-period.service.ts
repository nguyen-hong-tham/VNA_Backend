import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PeriodStatus, PeriodType } from '@prisma/client';
import { ReportPeriodRepository } from '../repositories/report-period.repository';
import {
  CreateReportPeriodDto,
  QueryReportPeriodDto,
  UpdateReportPeriodDto,
} from '../dto/report-period';

@Injectable()
export class ReportPeriodService {
  constructor(private reportPeriodRepo: ReportPeriodRepository) {}

  // Lấy danh sách kỳ báo cáo (có bộ lọc và phân trang)
  async findAll(query: QueryReportPeriodDto) {
    const page = query.current || 1; // Map 'current' từ frontend thành 'page'
    const limit = query.limit || 10;

    const { data, total } = await this.reportPeriodRepo.findAll(
      {
        search: query.search,
        year: query.year,
        periodType: query.periodType,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      { page, limit },
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Tìm kiếm kỳ báo cáo theo ID
  async findById(id: number) {
    const record = await this.reportPeriodRepo.findById(id);
    if (!record) {
      throw new NotFoundException('Không tìm thấy kỳ báo cáo');
    }
    return record;
  }

  // Tạo mới kỳ báo cáo
  async create(dto: CreateReportPeriodDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // 1. Kiểm tra tính hợp lệ của ngày tháng
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Ngày bắt đầu hoặc kết thúc không hợp lệ.');
    }

    // 2. Kiểm tra ngày bắt đầu phải trước ngày kết thúc
    if (start >= end) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
    }

    // 3. Kiểm tra ngày phải thuộc đúng năm báo cáo đã chọn
    if (start.getFullYear() !== dto.year) {
      throw new BadRequestException(
        `Ngày bắt đầu (${start.getFullYear()}) phải thuộc đúng năm báo cáo (${dto.year}).`,
      );
    }
    if (end.getFullYear() !== dto.year) {
      throw new BadRequestException(
        `Ngày kết thúc (${end.getFullYear()}) phải thuộc đúng năm báo cáo (${dto.year}).`,
      );
    }

    // 4. Kiểm tra khoảng thời gian phù hợp với loại kỳ báo cáo
    this.validatePeriodDates(dto.periodType, start, end, dto.year);

    // 5. Kiểm tra trùng lặp năm + loại kỳ báo cáo
    const existing = await this.reportPeriodRepo.findUniqueYearPeriod(
      dto.year,
      dto.periodType,
    );
    if (existing) {
      throw new ConflictException(
        `Kỳ báo cáo ${
          dto.periodType === 'YEAR' ? 'Cả năm' : '6 tháng'
        } của năm ${dto.year} đã tồn tại trên hệ thống.`,
      );
    }

    return this.reportPeriodRepo.create({
      reportName: dto.reportName.trim(),
      year: dto.year,
      periodType: dto.periodType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status ?? PeriodStatus.OPEN, // Nếu không chọn thì mặc định là OPEN (Hoạt động)
    });
  }

  // Cập nhật thông tin kỳ báo cáo
  async update(id: number, dto: UpdateReportPeriodDto) {
    const record = await this.findById(id);
    const hasReports = await this.reportPeriodRepo.hasReports(id);

    // 1. Nếu đã có dữ liệu báo cáo từ các doanh nghiệp, chặn không cho thay đổi các cấu hình quan trọng
    if (hasReports) {
      const isTryingToChangeConfig =
        (dto.year !== undefined && dto.year !== record.year) ||
        (dto.periodType !== undefined && dto.periodType !== record.periodType) ||
        (dto.startDate !== undefined && new Date(dto.startDate).getTime() !== (record.startDate ? record.startDate.getTime() : null)) ||
        (dto.endDate !== undefined && new Date(dto.endDate).getTime() !== (record.endDate ? record.endDate.getTime() : null));

      if (isTryingToChangeConfig) {
        throw new BadRequestException(
          'Không thể chỉnh sửa thông tin kỳ báo cáo vì đã phát sinh dữ liệu báo cáo của doanh nghiệp.',
        );
      }
    }

    // 2. Validate ngày bắt đầu và kết thúc
    const start = dto.startDate ? new Date(dto.startDate) : record.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : record.endDate;
    if (start && end) {
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Ngày bắt đầu hoặc kết thúc không hợp lệ.');
      }
      if (start >= end) {
        throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
      }
    }

    // 3. Validate năm của ngày bắt đầu/kết thúc phải đúng với năm của kỳ báo cáo
    const targetYear = dto.year !== undefined ? dto.year : record.year;
    if (start && start.getFullYear() !== targetYear) {
      throw new BadRequestException(
        `Ngày bắt đầu (${start.getFullYear()}) phải thuộc đúng năm báo cáo (${targetYear}).`,
      );
    }
    if (end && end.getFullYear() !== targetYear) {
      throw new BadRequestException(
        `Ngày kết thúc (${end.getFullYear()}) phải thuộc đúng năm báo cáo (${targetYear}).`,
      );
    }

    // 4. Validate khoảng thời gian theo kỳ báo cáo
    const targetPeriod = dto.periodType !== undefined ? dto.periodType : record.periodType;
    if (start && end) {
      this.validatePeriodDates(targetPeriod, start, end, targetYear);
    }

    // 5. Kiểm tra trùng lặp khi thay đổi năm hoặc kỳ báo cáo
    if (targetYear !== record.year || targetPeriod !== record.periodType) {
      const existing = await this.reportPeriodRepo.findUniqueYearPeriod(
        targetYear,
        targetPeriod,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Kỳ báo cáo ${
            targetPeriod === 'YEAR' ? 'Cả năm' : '6 tháng'
          } của năm ${targetYear} đã tồn tại trên hệ thống.`,
        );
      }
    }

    return this.reportPeriodRepo.update(id, {
      ...(dto.reportName !== undefined ? { reportName: dto.reportName.trim() } : {}),
      ...(dto.year !== undefined ? { year: dto.year } : {}),
      ...(dto.periodType !== undefined ? { periodType: dto.periodType } : {}),
      ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
      ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
  }

  // Cập nhật trạng thái bật/tắt (Hoạt động / Ngừng hoạt động)
  async updateStatus(id: number, status: PeriodStatus) {
    await this.findById(id);
    return this.reportPeriodRepo.update(id, { status });
  }

  // Xóa kỳ báo cáo
  async delete(id: number) {
    await this.findById(id);

    // Chặn xóa nếu kỳ báo cáo đã được phát sinh dữ liệu
    const hasReports = await this.reportPeriodRepo.hasReports(id);
    if (hasReports) {
      throw new BadRequestException(
        'Không thể xóa kỳ báo cáo này vì đã có dữ liệu báo cáo được khởi tạo từ các doanh nghiệp.',
      );
    }

    return this.reportPeriodRepo.delete(id);
  }

  // Kiểm tra khoảng thời gian bắt buộc của kỳ báo cáo
  private validatePeriodDates(
    periodType: PeriodType,
    start: Date,
    end: Date,
    year: number,
  ) {
    const startDay = start.getDate();
    const startMonth = start.getMonth(); // 0-indexed (Tháng 1 là 0)
    const endDay = end.getDate();
    const endMonth = end.getMonth();

    // YEAR: Bắt buộc từ 01/01 đến 31/12
    if (periodType === 'YEAR') {
      const isStartValid = startDay === 1 && startMonth === 0;
      const isEndValid = endDay === 31 && endMonth === 11;
      if (!isStartValid || !isEndValid) {
        throw new BadRequestException(
          `Kỳ báo cáo Cả năm phải bắt đầu từ ngày 01/01/${year} và kết thúc vào ngày 31/12/${year}.`,
        );
      }
    }

    // HALF_YEAR: Bắt buộc là Sáu tháng đầu năm (01/01 -> 30/06) HOẶC Sáu tháng cuối năm (01/07 -> 31/12)
    if (periodType === 'HALF_YEAR') {
      const isFirstHalf =
        startDay === 1 && startMonth === 0 && endDay === 30 && endMonth === 5;

      const isSecondHalf =
        startDay === 1 && startMonth === 6 && endDay === 31 && endMonth === 11;

      if (!isFirstHalf && !isSecondHalf) {
        throw new BadRequestException(
          `Kỳ báo cáo 6 tháng phải nằm trong một trong hai khoảng: từ 01/01/${year} đến 30/06/${year} hoặc từ 01/07/${year} đến 31/12/${year}.`,
        );
      }
    }
  }
}
