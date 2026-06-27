import { Injectable } from '@nestjs/common';
import { PrismaService } from '../repositories/prisma.service';
import { SectionType, ReportStatus, EnterpriseStatus, PeriodType } from '@prisma/client';
import { QuerySummaryReportDto } from '../dto/report_department/query-summary-report.dto';
import { BusinessTypeCode } from '../constants/business-type.constant';

export interface SummaryReportItem {
    stt: number,
    loaiHinh: string,
    maSo: string,
    tongSoCoSo: number,
    soCoSoThamGia: number,
    tongSoLaoDong: number,
    soLaoDongThamGia: number,
    soLaoDongNu: number,
    taiNanTongSo: number,
    taiNanNguoiChet: number,
    taiNanThuongNang: number,
    ktnld: string, // tần suất tai nạn lao động 
    kChet: string,// tân suất chết
    ghiChu: string,
}

@Injectable()
export class SummaryReportService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async getGeneralSummary(query: QuerySummaryReportDto) {
        const { year, provinceId } = query;

        // 1. Định nghĩa cấu trúc các nhóm loại hình doanh nghiệp (đúng 9 nhóm theo yêu cầu)
        const groupsConfig = [
            { key: 'NHA_NUOC', name: 'Doanh nghiệp nhà nước', code: '01', dbCodes: [BusinessTypeCode.STATE_OWNED, 'STATE_OWNED'] },
            { key: 'TNHH', name: 'Công ty trách nhiệm hữu hạn', code: '02', dbCodes: [BusinessTypeCode.TNHH_1TV, BusinessTypeCode.TNHH_2TV, 'TNHH1', 'TNHH2', 'COMPANY', 'ONE_MEMBER'] },
            { key: 'CO_PHAN', name: 'Công ty cổ phần', code: '03', dbCodes: [BusinessTypeCode.JOINT_STOCK, 'CP', 'JOINT_STOCK'] },
            { key: 'HOP_DANH', name: 'Công ty hợp danh', code: '04', dbCodes: [BusinessTypeCode.PARTNERSHIP, 'PARTNERSHIP'] },
            { key: 'TU_NHAN', name: 'Doanh nghiệp tư nhân', code: '05', dbCodes: [BusinessTypeCode.PRIVATE_ENTERPRISE, 'DNTN', 'PRIVATE'] },
            { key: 'FDI', name: 'Doanh nghiệp có vốn đầu tư nước ngoài', code: '06', dbCodes: [BusinessTypeCode.FOREIGN_INVESTED, 'FOREIGN'] },
            { key: 'TAP_THE', name: 'Đơn vị kinh tế tập thể', code: '07', dbCodes: [BusinessTypeCode.COOPERATIVE, 'HTX', 'COOPERATIVE', 'ASSOCIATION'] },
            { key: 'CA_THE', name: 'Đơn vị kinh tế cá thể', code: '08', dbCodes: [BusinessTypeCode.INDIVIDUAL_HOUSEHOLD, 'HOUSEHOLD'] },
            { key: 'HANH_CHINH', name: 'Đơn vị hành chính sự nghiệp, Đảng, đoàn thể, hiệp hội', code: '09', dbCodes: [BusinessTypeCode.ADMINISTRATIVE] },
        ];

        // 2. Lấy tất cả doanh nghiệp được duyệt hoạt động (APPROVED) thuộc tỉnh đã chọn
        const enterprises = await this.prisma.enterprise.findMany({
            where: {
                provinceId,
                status: EnterpriseStatus.APPROVED,

            },
            include: {
                businessType: true,
                // Lấy báo cáo mới nhất của doanh nghiệp (cho tới năm được truy vấn) để tính tổng số lao động thực tế
                reports: {
                    where: {
                        reportPeriod: {
                            year: { lte: year },
                            periodType: PeriodType.YEAR,
                        },
                        status: ReportStatus.APPROVED,
                    },
                    orderBy: { reportPeriod: { year: 'desc' } },
                    take: 1,
                    select: { companyEmployeeTotal: true },
                },
            },
        });

        // 3. Lấy tất cả báo cáo đã tiếp nhận (APPROVED) trong năm & tỉnh đã chọn
        const reports = await this.prisma.report.findMany({
            where: {
                reportPeriod: {
                    year,
                    periodType: PeriodType.YEAR,
                },
                status: ReportStatus.APPROVED,
                enterprise: {
                    provinceId,
                    status: EnterpriseStatus.APPROVED,
                },
            },
            include: {
                enterprise: {
                    include: { businessType: true },
                },
                sections: {
                    where: { sectionType: SectionType.ACCIDENT },
                },
            },
        });

        // 4. Khởi tạo cấu trúc lưu trữ kết quả cho từng nhóm
        const groupResults = groupsConfig.map((group, idx) => ({
            stt: idx + 1,
            key: group.key,
            loaiHinh: group.name,
            maSo: group.code,
            tongSoCoSo: 0,
            soCoSoThamGia: 0,
            tongSoLaoDong: 0,
            soLaoDongThamGia: 0,
            soLaoDongNu: 0,
            taiNanTongSo: 0,
            taiNanNguoiChet: 0,
            taiNanThuongNang: 0,
            dbCodes: group.dbCodes,
        }));

        // Hàm phụ trợ để xác định một doanh nghiệp thuộc nhóm nào dựa trên mã BusinessType
        const getGroupIndex = (businessTypeCode: string) => {
            return groupResults.findIndex(g => g.dbCodes.includes(businessTypeCode));
        };

        // 5. Phân bổ và tính toán tổng số doanh nghiệp & tổng số lao động (từ danh sách doanh nghiệp)
        for (const ent of enterprises) {
            const gIdx = getGroupIndex(ent.businessType.code);
            if (gIdx === -1) continue; // Bỏ qua nếu mã loại hình không khớp định nghĩa

            groupResults[gIdx].tongSoCoSo += 1;
            const latestReportEmployee = ent.reports[0]?.companyEmployeeTotal ?? 0;
            groupResults[gIdx].tongSoLaoDong += latestReportEmployee;
        }

        // 6. Lũy kế dữ liệu báo cáo thực tế đã tiếp nhận (APPROVED)
        for (const r of reports) {
            const gIdx = getGroupIndex(r.enterprise.businessType.code);
            if (gIdx === -1) continue; // Bỏ qua nếu mã loại hình không khớp định nghĩa

            const accSection = r.sections[0]; // Chỉ có 1 section type ACCIDENT do đã filter ở câu query

            groupResults[gIdx].soCoSoThamGia += 1;
            groupResults[gIdx].soLaoDongThamGia += r.companyEmployeeTotal;
            groupResults[gIdx].soLaoDongNu += r.femaleEmployeeTotal;

            if (accSection) {
                groupResults[gIdx].taiNanTongSo += accSection.victimCount;
                groupResults[gIdx].taiNanNguoiChet += accSection.deathCount;
                groupResults[gIdx].taiNanThuongNang += accSection.severelyInjuredCount;
            }
        }

        // 7. Định dạng kết quả, tính toán chỉ số tần suất (KTNLĐ, KChết)
        const formattedRows: SummaryReportItem[] = groupResults.map(g => {
            const soLd = g.soLaoDongThamGia;
            const ktnldVal = soLd > 0 ? (g.taiNanTongSo / soLd) * 1000 : 0;
            const kChetVal = soLd > 0 ? (g.taiNanNguoiChet / soLd) * 1000 : 0;

            return {
                stt: g.stt,
                loaiHinh: g.loaiHinh,
                maSo: g.maSo,
                tongSoCoSo: g.tongSoCoSo,
                soCoSoThamGia: g.soCoSoThamGia,
                tongSoLaoDong: g.tongSoLaoDong,
                soLaoDongThamGia: g.soLaoDongThamGia,
                soLaoDongNu: g.soLaoDongNu,
                taiNanTongSo: g.taiNanTongSo,
                taiNanNguoiChet: g.taiNanNguoiChet,
                taiNanThuongNang: g.taiNanThuongNang,
                ktnld: ktnldVal.toFixed(2),
                kChet: kChetVal.toFixed(2),
                ghiChu: '',
            };
        });

        // 8. Tính dòng Tổng số (Cộng dồn tất cả các nhóm)
        const grandTotal: SummaryReportItem = {
            stt: 0, // Ký hiệu dòng tổng
            loaiHinh: 'Tổng số',
            maSo: '',
            tongSoCoSo: formattedRows.reduce((sum, r) => sum + r.tongSoCoSo, 0),
            soCoSoThamGia: formattedRows.reduce((sum, r) => sum + r.soCoSoThamGia, 0),
            tongSoLaoDong: formattedRows.reduce((sum, r) => sum + r.tongSoLaoDong, 0),
            soLaoDongThamGia: formattedRows.reduce((sum, r) => sum + r.soLaoDongThamGia, 0),
            soLaoDongNu: formattedRows.reduce((sum, r) => sum + r.soLaoDongNu, 0),
            taiNanTongSo: formattedRows.reduce((sum, r) => sum + r.taiNanTongSo, 0),
            taiNanNguoiChet: formattedRows.reduce((sum, r) => sum + r.taiNanNguoiChet, 0),
            taiNanThuongNang: formattedRows.reduce((sum, r) => sum + r.taiNanThuongNang, 0),
            ktnld: '0.00',
            kChet: '0.00',
            ghiChu: '',
        };

        // Tính chỉ số tần suất cho dòng Tổng số
        const totalLd = grandTotal.soLaoDongThamGia;
        const totalKtnld = totalLd > 0 ? (grandTotal.taiNanTongSo / totalLd) * 1000 : 0;
        const totalKChet = totalLd > 0 ? (grandTotal.taiNanNguoiChet / totalLd) * 1000 : 0;
        grandTotal.ktnld = totalKtnld.toFixed(2);
        grandTotal.kChet = totalKChet.toFixed(2);

        return {
            title: `Báo cáo tổng hợp tình hình tai nạn lao động năm ${year}`,
            provinceId,
            year,
            summaryTable: [grandTotal, ...formattedRows],
        };
    }
}

