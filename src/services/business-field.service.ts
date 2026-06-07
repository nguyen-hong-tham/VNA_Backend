import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BusinessFieldRepository } from '../repositories/business-field.repository';
import { CreateBusinessFieldDto } from '../dto/create-business-field.dto';
import { UpdateBusinessFieldDto } from '../dto/update-business-field.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class BusinessFieldService {
  constructor(private businessFieldRepo: BusinessFieldRepository) {}

  async findAll(filters: {
    code?: string;
    name?: string;
    level?: number;
    status?: boolean;
  }) {
    return this.businessFieldRepo.findAll(filters);
  }

  async findById(id: number) {
    const record = await this.businessFieldRepo.findById(id);
    if (!record) {
      throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
    }
    return record;
  }

  async create(dto: CreateBusinessFieldDto) {
    const code = dto.code.trim();
    const existing = await this.businessFieldRepo.findByCode(code);
    if (existing) {
      throw new ConflictException('Mã ngành nghề này đã tồn tại trong hệ thống');
    }

    const name = dto.name.trim();
    const level = this.calculateLevel(code);

    let parentId = dto.parentId;
    if (parentId === undefined && level > 1) {
      parentId = (await this.findParentIdByCodePrefix(code, level)) || undefined;
    }

    return this.businessFieldRepo.create({
      code,
      name,
      level,
      status: dto.status !== undefined ? dto.status : true,
      parent: parentId ? { connect: { id: parentId } } : undefined,
    });
  }

  async update(id: number, dto: UpdateBusinessFieldDto) {
    const existing = await this.businessFieldRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
    }

    return this.businessFieldRepo.update(id, {
      name: dto.name !== undefined ? dto.name.trim() : undefined,
      status: dto.status !== undefined ? dto.status : undefined,
    });
  }

  private calculateLevel(code: string): number {
    const trimmed = code.trim();
    // Chữ cái đơn (A, B, C...) -> Cấp 1
    if (/^[a-zA-Z]$/.test(trimmed)) {
      return 1;
    }
    // Số -> Cấp = Độ dài chuỗi mã
    return trimmed.length;
  }

  private getLevel1ParentCode(code2: string): string | null {
    const num = parseInt(code2, 10);
    if (isNaN(num)) return null;

    if (num >= 1 && num <= 3) return 'A';
    if (num >= 5 && num <= 9) return 'B';
    if (num >= 10 && num <= 33) return 'C';
    if (num === 35) return 'D';
    if (num >= 36 && num <= 39) return 'E';
    if (num >= 41 && num <= 43) return 'F';
    if (num >= 45 && num <= 47) return 'G';
    if (num >= 49 && num <= 53) return 'H';
    if (num >= 55 && num <= 56) return 'I';
    if (num >= 58 && num <= 63) return 'J';
    if (num >= 64 && num <= 66) return 'K';
    if (num === 68) return 'L';
    if (num >= 69 && num <= 75) return 'M';
    if (num >= 77 && num <= 82) return 'N';
    if (num === 84) return 'O';
    if (num === 85) return 'P';
    if (num >= 86 && num <= 88) return 'Q';
    if (num >= 90 && num <= 93) return 'R';
    if (num >= 94 && num <= 96) return 'S';
    if (num >= 97 && num <= 98) return 'T';
    if (num === 99) return 'U';
    return null;
  }

  private async findParentIdByCodePrefix(
    code: string,
    level: number,
  ): Promise<number | null> {
    if (level <= 1) return null;

    let parentCode: string | null = null;
    if (level === 2) {
      parentCode = this.getLevel1ParentCode(code);
    } else if (level === 3) {
      parentCode = code.slice(0, 2);
    } else if (level === 4) {
      parentCode = code.slice(0, 3);
    }

    if (parentCode) {
      const parent = await this.businessFieldRepo.findByCode(parentCode);
      return parent ? parent.id : null;
    }
    return null;
  }

  private async findFieldByCodeWithPadding(code: string): Promise<any> {
    const trimmed = code.trim();
    // 1. Tìm chính xác trước
    let field = await this.businessFieldRepo.findByCode(trimmed);
    if (field) return field;

    // 2. Nếu là số, thử bù số 0 ở đầu (độ dài từ length + 1 đến tối đa 4 ký tự)
    if (/^\d+$/.test(trimmed)) {
      const numVal = parseInt(trimmed, 10);
      for (let len = trimmed.length + 1; len <= 4; len++) {
        const padded = String(numVal).padStart(len, '0');
        field = await this.businessFieldRepo.findByCode(padded);
        if (field) return field;
      }
    }
    return null;
  }

  async importFromFile(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file tải lên');
    }

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (rows.length === 0) {
        throw new BadRequestException('File tải lên không có dữ liệu');
      }

      let count = 0;
      let currentLevel1Id: number | null = null;
      let currentLevel2Id: number | null = null;
      let currentLevel3Id: number | null = null;

      for (const row of rows) {
        // Ánh xạ cột linh hoạt
        const codeKey = Object.keys(row).find((k) =>
          [
            'ma nganh',
            'ma',
            'code',
            'mã ngành',
            'mã',
            'mã ngành nghề',
            'mã ngành nghề kinh doanh',
          ].includes(k.toLowerCase().trim()),
        );
        const nameKey = Object.keys(row).find((k) =>
          [
            'ten nganh',
            'ten',
            'name',
            'tên ngành',
            'tên',
            'tên ngành nghề',
            'tên ngành nghề kinh doanh',
          ].includes(k.toLowerCase().trim()),
        );
        const parentKey = Object.keys(row).find((k) =>
          [
            'cha',
            'nganh cha',
            'parent',
            'mã cha',
            'ma cha',
            'ngành cha',
            'mã ngành cha',
          ].includes(k.toLowerCase().trim()),
        );
        const levelKey = Object.keys(row).find((k) =>
          ['cap', 'level', 'cấp', 'cấp độ'].includes(k.toLowerCase().trim()),
        );
        const statusKey = Object.keys(row).find((k) =>
          ['trang thai', 'status', 'trạng thái'].includes(k.toLowerCase().trim()),
        );

        if (!codeKey || !nameKey) {
          continue;
        }

        const rawCode = String(row[codeKey]).trim();
        let rawName = String(row[nameKey]).trim();

        if (!rawCode || !rawName) {
          continue;
        }

        // Loại bỏ ký tự gạch ngang thụt lề ở tên ngành nếu có
        rawName = rawName.replace(/^[-–—\s\.]+/g, '').trim();

        // 1. Phân tích Cấp (Level)
        let level = 1;
        let parentId: number | null = null;

        // Đọc trường Cấp nếu có trong Excel
        let explicitLevel: number | null = null;
        if (levelKey && row[levelKey] !== undefined) {
          const levelStr = String(row[levelKey]).replace(/\D/g, '');
          if (levelStr) {
            explicitLevel = parseInt(levelStr, 10);
          }
        }

        // Đọc trường Cha nếu có trong Excel
        const rawParentCode =
          parentKey && row[parentKey] !== undefined
            ? String(row[parentKey]).trim()
            : null;

        if (rawParentCode) {
          const parentField = await this.findFieldByCodeWithPadding(rawParentCode);
          if (parentField) {
            parentId = parentField.id;
            level = parentField.level + 1;
          } else {
            level = explicitLevel || this.calculateLevel(rawCode);
          }
        } else {
          level = explicitLevel || this.calculateLevel(rawCode);
        }

        // 2. Chuẩn hóa Mã (code) để bù đắp việc Excel cắt mất số 0 ở đầu
        let code = rawCode;
        if (/^\d+$/.test(code) && level >= 2) {
          code = code.padStart(level, '0');
        }

        // 3. Giải quyết parentId theo vết tuần tự nếu vẫn chưa tìm thấy qua cột "Cha"
        if (!parentId && level > 1) {
          if (level === 2) {
            parentId =
              currentLevel1Id ||
              (await this.findParentIdByCodePrefix(code, level));
          } else if (level === 3) {
            parentId =
              currentLevel2Id ||
              (await this.findParentIdByCodePrefix(code, level));
          } else if (level === 4) {
            parentId =
              currentLevel3Id ||
              (await this.findParentIdByCodePrefix(code, level));
          }
        }

        // Cập nhật trạng thái
        let status = true;
        if (statusKey && row[statusKey] !== undefined) {
          const rawStatus = String(row[statusKey]).toLowerCase().trim();
          if (
            [
              'không',
              'khong',
              'inactive',
              'false',
              '0',
              'no',
              'n',
              'không sử dụng',
              'khong su dung',
            ].includes(rawStatus)
          ) {
            status = false;
          }
        }

        // Lưu vào DB
        const savedRecord = await this.businessFieldRepo.upsert(
          code,
          rawName,
          level,
          parentId,
          status,
        );

        // Lưu vết cấp độ vừa tạo/cập nhật
        if (level === 1) {
          currentLevel1Id = savedRecord.id;
          currentLevel2Id = null;
          currentLevel3Id = null;
        } else if (level === 2) {
          currentLevel2Id = savedRecord.id;
          currentLevel3Id = null;
        } else if (level === 3) {
          currentLevel3Id = savedRecord.id;
        }

        count++;
      }

      return {
        message: `Đã nhập dữ liệu thành công ${count} bản ghi ngành nghề từ file`,
        importedCount: count,
      };
    } catch (e: any) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException(`Lỗi khi xử lý file Excel: ${e.message}`);
    }
  }
}
