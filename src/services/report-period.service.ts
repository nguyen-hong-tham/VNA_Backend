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
  constructor(private reportPeriodRepo: ReportPeriodRepository) { }

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

    // Chuẩn hóa ngày về 00:00:00 để so sánh chính xác theo ngày
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    const startCompare = new Date(start);
    startCompare.setHours(0, 0, 0, 0);

    // 1. Kiểm tra tính hợp lệ của ngày tháng
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Ngày bắt đầu hoặc kết thúc không hợp lệ.');
    }

    // 2. Kiểm tra ngày bắt đầu phải trước ngày kết thúc
    if (start >= end) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
    }

    // kiểm tra trùng lặp: một năm chỉ được tối đa 1 kì báo cáo YEAR-HALF_YEAR  
    const status = dto.status ?? PeriodStatus.OPEN;
    const existing = await this.reportPeriodRepo.findByYearAndType(dto.year, dto.periodType);

    if (existing) {
      throw new ConflictException(`Kỳ báo cáo ${dto.periodType === 'YEAR' ? 'Cả năm' : '6 tháng'} của năm ${dto.year} đã tồn tại trên hệ thống.`)
    }

    const reportName = dto.reportName.trim();
    if (!reportName) {
      throw new BadRequestException('Tên báo cáo không được để trống.');
    }

    return this.reportPeriodRepo.create({
      reportName,
      year: dto.year,
      periodType: dto.periodType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status,
    });
  }

  // Cập nhật thông tin kỳ báo cáo
  async update(id: number, dto: UpdateReportPeriodDto) {
    const record = await this.findById(id);
    const hasReports = await this.reportPeriodRepo.hasReports(id);

    if (dto.reportName !== undefined || dto.periodType !== undefined || dto.year !== undefined) {
      throw new BadRequestException("Không được phép chỉnh sửa các trường tên báo cáo, loại báo cáo, năm báo cáo.")
    }

    // kiem tra ngày bắt đầu và ngày kết thúc ko được để null hoặc undefined
    const start = dto.startDate !== undefined ? dto.startDate : record.startDate;
    const end = dto.endDate !== undefined ? dto.endDate : record.endDate;
    if (start === null || start === undefined || end === null || end === undefined) {
      throw new BadRequestException('Ngày bắt đầu và ngày kết thúc không được để trống.');
    }

    // kiểm tra ngày bắt đầu phải trước ngày kết thúc
    const startObj = new Date(start);
    const endObj = new Date(end);
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      throw new BadRequestException('Ngày bắt đầu hoặc kết thúc không hợp lệ.');
    }
    if (startObj >= endObj) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
    }
    return this.reportPeriodRepo.update(id, {
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


}
