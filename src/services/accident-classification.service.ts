import { Injectable } from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';
import { SectionType, ReportStatus, EnterpriseStatus, PeriodType, CategoryType } from '@prisma/client';
import { QuerySummaryReportDto } from '../dto/report_department/query-summary-report.dto';

export interface SummaryAccidentClassifiedItem {
    stt: number;
    tenDanhMuc: string;
    maDanhMuc: string;
    nhomDanhMuc: string; // Mới: Lưu tên nhóm lớn ("Phân theo ngành nghề", "Phân theo nguyên nhân", "Phân theo yếu tố gây chấn thương")
    soVu: number;
    soVuCoNguoiChet: number;
    soVuCoNhieuNguoiBiNan: number;
    soNguoiBiNan: number;
    soNguoiBiNanNu: number;
    soNguoiChet: number;
    soNguoiBiThuongNang: number;
    soNgayNghi: number;
    tongSoTien: number;
    yTe: number;
    traLuong: number;
    boiThuong: number;
    thietHaiTaiSan: number;
}

export interface SummaryReportPartIIResponse {
    summaryTable: SummaryAccidentClassifiedItem[]; // Flat list chứa toàn bộ bảng để tiện render
    byOccupation: SummaryAccidentClassifiedItem[];
    byCause: SummaryAccidentClassifiedItem[];
    byFactor: SummaryAccidentClassifiedItem[];
}

@Injectable()
export class AccidentClassificationService {
    constructor(private prisma: PrismaService) { }

    // Phương thức chính tính toán Phân loại tai nạn lao động
    async getAccidentClassifiedSummary(query: QuerySummaryReportDto): Promise<SummaryReportPartIIResponse> {
        console.log("ACCIDENT SERVICE QUERY:", query, "TYPES:", typeof query.year, typeof query.provinceId);
        // Bước A: Tải danh sách báo cáo, chỉ include sâu đến phần cases chi tiết
        const reports = await this.prisma.report.findMany({
            where: {
                reportPeriod: { year: query.year, periodType: PeriodType.YEAR },
                status: ReportStatus.APPROVED,
                enterprise: { provinceId: query.provinceId, status: EnterpriseStatus.APPROVED }
            },
            include: {
                sections: {
                    where: { sectionType: SectionType.ACCIDENT },
                    include: {
                        accidentCases: {
                            include: {
                                occupation: true,
                                accidentCause: true,
                                injuryFactor: true
                            }
                        }
                    }
                }
            }
        });

        // Bước B: Tải danh mục Categories hoạt động làm khung hiển thị, sắp xếp theo mã
        const allCategories = await this.prisma.category.findMany({
            where: { status: true },
            orderBy: { code: 'asc' }
        });

        // Bước C: Làm phẳng danh sách các ca tai nạn (Dùng flatMap lồng để tránh giả định index [0] cứng nhắc)
        const allCases = reports.flatMap(r => r.sections.flatMap(s => s.accidentCases || []));

        // Bước D: Cộng dồn số liệu theo từng chiều danh mục (gán tên nhóm tương ứng)
        const byOccupation = this.aggregateCases(
            allCases,
            allCategories.filter(c => c.type === CategoryType.OCCUPATION),
            'occupationId',
            'Phân theo ngành nghề'
        );

        const byCause = this.aggregateCases(
            allCases,
            allCategories.filter(c => c.type === CategoryType.ACCIDENT_CAUSE),
            'accidentCauseId',
            'Phân theo nguyên nhân'
        );

        const byFactor = this.aggregateCases(
            allCases,
            allCategories.filter(c => c.type === CategoryType.INJURY_FACTOR),
            'injuryFactorId',
            'Phân theo yếu tố gây chấn thương'
        );

        // Bước E: Tính toán dòng "Tổng số" duy nhất đại diện cho toàn bộ báo cáo
        const grandTotal: SummaryAccidentClassifiedItem = {
            stt: 0,
            tenDanhMuc: 'Tổng số',
            maDanhMuc: '',
            nhomDanhMuc: 'Tổng số',
            soVu: allCases.reduce((sum, c) => sum + (c.accidentCount ?? 0), 0),
            soVuCoNguoiChet: allCases.reduce((sum, c) => sum + (c.fatalAccidentCount ?? 0), 0),
            soVuCoNhieuNguoiBiNan: allCases.reduce((sum, c) => sum + (c.multiVictimAccidentCount ?? 0), 0),
            soNguoiBiNan: allCases.reduce((sum, c) => sum + (c.victimCount ?? 0), 0),
            soNguoiBiNanNu: allCases.reduce((sum, c) => sum + (c.femaleVictimCount ?? 0), 0),
            soNguoiChet: allCases.reduce((sum, c) => sum + (c.deathCount ?? 0), 0),
            soNguoiBiThuongNang: allCases.reduce((sum, c) => sum + (c.severelyInjuredCount ?? 0), 0),
            soNgayNghi: allCases.reduce((sum, c) => sum + (c.daysLost ?? 0), 0),
            tongSoTien: allCases.reduce((sum, c) => sum + Number(c.medicalCost || 0) + Number(c.salaryCompensation || 0) + Number(c.compensationCost || 0), 0),
            yTe: allCases.reduce((sum, c) => sum + Number(c.medicalCost || 0), 0),
            traLuong: allCases.reduce((sum, c) => sum + Number(c.salaryCompensation || 0), 0),
            boiThuong: allCases.reduce((sum, c) => sum + Number(c.compensationCost || 0), 0),
            thietHaiTaiSan: allCases.reduce((sum, c) => sum + Number(c.assetDamage || 0), 0),
        };

        // Gộp tất cả thành 1 bảng phẳng duy nhất theo cấu trúc hiển thị UI
        const summaryTable = [
            grandTotal,
            ...byOccupation,
            ...byCause,
            ...byFactor
        ];

        return { summaryTable, byOccupation, byCause, byFactor };
    }

    // Thuật toán gom nhóm dùng chung
    private aggregateCases(
        cases: any[],
        categories: any[],
        relationKey: 'occupationId' | 'accidentCauseId' | 'injuryFactorId',
        groupLabel: string
    ): SummaryAccidentClassifiedItem[] {
        const map = new Map<number, SummaryAccidentClassifiedItem>();

        // 1. Khởi tạo mảng kết quả trống khớp với danh sách Categories để đảm bảo hiển thị đủ dòng
        const result: SummaryAccidentClassifiedItem[] = categories.map((cat) => {
            const item: SummaryAccidentClassifiedItem = {
                stt: 0,
                tenDanhMuc: cat.name,
                maDanhMuc: cat.code,
                nhomDanhMuc: groupLabel, // Gán nhãn tên nhóm lớn
                soVu: 0,
                soVuCoNguoiChet: 0,
                soVuCoNhieuNguoiBiNan: 0,
                soNguoiBiNan: 0,
                soNguoiBiNanNu: 0,
                soNguoiChet: 0,
                soNguoiBiThuongNang: 0,
                soNgayNghi: 0,
                tongSoTien: 0,
                yTe: 0,
                traLuong: 0,
                boiThuong: 0,
                thietHaiTaiSan: 0,
            };
            map.set(cat.id, item);
            return item;
        });

        // 2. Duyệt qua mảng cases, tìm danh mục tương ứng qua relationKey và cộng dồn số liệu
        for (const c of cases) {
            const catId = c[relationKey];
            if (!catId) continue;

            const item = map.get(catId);
            if (!item) continue;

            item.soVu += c.accidentCount ?? 0;
            item.soVuCoNguoiChet += c.fatalAccidentCount ?? 0;
            item.soVuCoNhieuNguoiBiNan += c.multiVictimAccidentCount ?? 0;
            item.soNguoiBiNan += c.victimCount ?? 0;
            item.soNguoiBiNanNu += c.femaleVictimCount ?? 0;
            item.soNguoiChet += c.deathCount ?? 0;
            item.soNguoiBiThuongNang += c.severelyInjuredCount ?? 0;
            item.soNgayNghi += c.daysLost ?? 0;

            // Ép kiểu Decimal sang Number để tránh lỗi cộng dồn chuỗi văn bản hoặc NaN
            const yTeVal = Number(c.medicalCost || 0);
            const traLuongVal = Number(c.salaryCompensation || 0);
            const boiThuongVal = Number(c.compensationCost || 0);

            item.yTe += yTeVal;
            item.traLuong += traLuongVal;
            item.boiThuong += boiThuongVal;
            item.tongSoTien += (yTeVal + traLuongVal + boiThuongVal);
            item.thietHaiTaiSan += Number(c.assetDamage || 0);
        }

        // 3. Đánh số thứ tự (stt) dựa trên kết quả phân loại
        result.forEach((item, index) => {
            item.stt = index + 1;
        });

        return result;
    }
}