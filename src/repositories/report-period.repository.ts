import { Injectable } from '@nestjs/common';
import { Prisma, PeriodStatus, PeriodType } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class ReportPeriodRepository {
    constructor(private prisma: PrismaService) { }

    async findAll(
        filter: {
            search?: string;
            year?: number;
            periodType?: PeriodType;
            status?: PeriodStatus;
            startDate?: Date;
            endDate?: Date;

        },
        pagination: {
            page: number;
            limit: number;
        }
        //Truy vấn danh sách các kỳ báo cáo từ Database kèm theo bộ lọc điều kiện (Filter) và phân trang (Pagination).

    ) {
        const { page, limit } = pagination;
        const skip = (page - 1) * limit;

        const where: Prisma.ReportPeriodWhereInput = {};
        if (filter.search) {
            // tìm kiếm cần đúng ko phân biệt hoa thường, chữ thường cho autocomplete
            where.reportName = {
                contains: filter.search,
                mode: 'insensitive'
            };

        }
        if (filter.year !== undefined) {
            where.year = filter.year;
        }
        if (filter.periodType !== undefined) {
            where.periodType = filter.periodType;
        }
        if (filter.status !== undefined) {
            where.status = filter.status;
        }
        if (filter.startDate !== undefined) {
            where.startDate = filter.startDate;
        }
        if (filter.endDate !== undefined) {
            where.endDate = filter.endDate;
        }
        // đếm tổng số bảng ghi
        const [data, total] = await Promise.all([
            this.prisma.reportPeriod.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ year: 'desc' }, { periodType: 'asc' }],
            }),
            this.prisma.reportPeriod.count({ where })
        ])

        return { data, total }
    }
    // Tìm kiếm thông tin chi tiết của duy nhất một kỳ báo cáo dựa vào khóa chính id
    async findById(id: number) {
        return this.prisma.reportPeriod.findUnique({
            where: { id },
        });
    }
    // Tìm kiếm kỳ báo cáo bằng khóa duy nhất kết hợp giữa Năm (year), Loại kỳ (periodType) và Ngày bắt đầu (startDate)
    // Do thiết kế cơ sở dữ liệu, một năm chỉ được phép có tối đa 1 kỳ báo cáo Cả năm (YEAR) và tối đa 2 kỳ báo cáo 6 tháng (HALF_YEAR). Database đã chặn trùng bằng ràng buộc duy nhất @@unique([year, periodType, startDate]).
    // Hàm này được Service gọi lên trước khi tạo mới hoặc cập nhật thông tin kỳ báo cáo nhằm kiểm tra xem cặp (Năm + Loại kỳ + Ngày bắt đầu) này đã tồn tại hay chưa. Nếu đã tồn tại, Service sẽ ném ra lỗi 409 Conflict.
    async findUniqueYearPeriod(year: number, periodType: PeriodType, startDate: Date) {
        return this.prisma.reportPeriod.findUnique({
            where: {
                uq_report_period: { year, periodType, startDate },
            },
        });
    }

    async create(data: Prisma.ReportPeriodCreateInput) {
        return this.prisma.reportPeriod.create({
            data,
        });
    }
    async update(id: number, data: Prisma.ReportPeriodUpdateInput) {
        return this.prisma.reportPeriod.update({
            where: { id },
            data,
        });
    }
    async delete(id: number) {
        return this.prisma.reportPeriod.delete({
            where: { id },
        });
    }

    // Kiểm tra xem kỳ báo cáo này đã được khởi tạo/nộp báo cáo bởi doanh nghiệp nào chưa.
    // Mục đích: Phục vụ validate chặn sửa đổi thời gian/xóa cấu hình khi đã phát sinh dữ liệu.
    //Đếm số lượng báo cáo tai nạn lao động của doanh nghiệp liên kết với kỳ báo cáo này. Trả về true nếu đã có ít nhất 1 doanh nghiệp tạo hoặc nộp báo cáo trong kỳ này.
    async hasReports(id: number): Promise<boolean> {
        const count = await this.prisma.report.count({
            where: { reportPeriodId: id },
        });
        return count > 0;
    }

    // tìm kiếm kì báo cáo theo năm và loại kì báo cáo để kiểm tra trùng lặp
    async findByYearAndType(year: number, periodType: PeriodType) {
        return this.prisma.reportPeriod.findFirst({
            where: { year, periodType },
        });
    }
}


