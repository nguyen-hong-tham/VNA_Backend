import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BusinessTypeRepository } from '../repositories/business-type.repository';
import { CreateBusinessTypeDto } from '../dto/create-business-type.dto';
import { UpdateBusinessTypeDto } from '../dto/update-business-type.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class BusinessTypeService {
  constructor(private businessTypeRepo: BusinessTypeRepository) {}

  async findAll(filters: { code?: string; name?: string; status?: boolean }) {
    return this.businessTypeRepo.findAll(filters);
  }

  async findById(id: number) {
    const record = await this.businessTypeRepo.findById(id);
    if (!record) {
      throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    }
    return record;
  }

  async create(dto: CreateBusinessTypeDto) {
    const existing = await this.businessTypeRepo.findByCode(dto.code.trim());
    if (existing) {
      throw new ConflictException('Mã loại hình này đã tồn tại trong hệ thống');
    }

    return this.businessTypeRepo.create({
      code: dto.code.trim(),
      name: dto.name.trim(),
      status: dto.status !== undefined ? dto.status : true,
    });
  }

  async update(id: number, dto: UpdateBusinessTypeDto) {
    const existing = await this.businessTypeRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    }

    return this.businessTypeRepo.update(id, {
      name: dto.name !== undefined ? dto.name.trim() : undefined,
      status: dto.status !== undefined ? dto.status : undefined,
    });
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

      for (const row of rows) {
        // Tìm tiêu đề cột linh hoạt theo tên tiếng Việt/Anh thông dụng
        const codeKey = Object.keys(row).find((k) =>
          [
            'ma loai hinh',
            'ma',
            'code',
            'mã loại hình',
            'mã',
            'mã loại hình kinh doanh',
          ].includes(k.toLowerCase().trim()),
        );
        const nameKey = Object.keys(row).find((k) =>
          [
            'ten loai hinh',
            'ten',
            'name',
            'tên loại hình',
            'tên',
            'tên loại hình kinh doanh',
          ].includes(k.toLowerCase().trim()),
        );
        const statusKey = Object.keys(row).find((k) =>
          ['trang thai', 'status', 'trạng thái'].includes(k.toLowerCase().trim()),
        );

        if (!codeKey || !nameKey) {
          continue; // Bỏ qua nếu dòng không khớp cột mã và tên
        }

        const rawCode = String(row[codeKey]).trim();
        const rawName = String(row[nameKey]).trim();

        if (!rawCode || !rawName) {
          continue; // Bỏ qua nếu để trống mã hoặc tên
        }

        // Phân tích trạng thái hoạt động
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

        await this.businessTypeRepo.upsert(rawCode, rawName, status);
        count++;
      }

      return {
        message: `Đã nhập dữ liệu thành công ${count} bản ghi từ file`,
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
