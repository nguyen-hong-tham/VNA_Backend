import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import * as XLSX from 'xlsx';

@Injectable()
export class CategoryService {
  constructor(private categoryRepo: CategoryRepository) {}

  // Loại danh mục hỗ trợ phân cấp cha/con
  private readonly HIERARCHICAL_TYPES: CategoryType[] = [
    CategoryType.OCCUPATION,
    CategoryType.ACCIDENT_CAUSE,
    CategoryType.INJURY_TYPE,
  ];
  private isHierarchical(type: CategoryType) {
    return this.HIERARCHICAL_TYPES.includes(type);
  }

  // 1. Lấy danh sách (có filter)
  async findAll(filters: {
    type?: CategoryType;
    code?: string;
    name?: string;
    status?: boolean;
  }) {
    return this.categoryRepo.findAll(filters);
  }

  // 2. Lấy chi tiết
  async findById(id: number) {
    const record = await this.categoryRepo.findById(id);
    if (!record) throw new NotFoundException('Không tìm thấy danh mục');
    return record;
  }

  // 3. Tạo mới
  async create(dto: CreateCategoryDto) {
    if (!dto.type) {
      throw new BadRequestException(
        'Vui lòng cung cấp loại danh mục (type) trong body hoặc query param ?type=...',
      );
    }
    const type = dto.type;

    const existing = await this.categoryRepo.findByTypeAndCode(
      type,
      dto.code.trim(),
    );
    if (existing) {
      throw new ConflictException(
        `Mã "${dto.code}" đã tồn tại trong loại danh mục "${type}"`,
      );
    }

    // Kiểm tra parentId/level — chỉ cho phép với loại có phân cấp
    if (dto.parentId) {
      if (!this.isHierarchical(type)) {
        throw new BadRequestException(
          `Loại danh mục "${type}" không hỗ trợ phân cấp cha/con`,
        );
      }
      const parent = await this.categoryRepo.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Không tìm thấy danh mục cha');
      if (parent.type !== type)
        throw new BadRequestException(
          'Danh mục cha phải cùng loại (type) với danh mục con',
        );
    }

    const level = this.isHierarchical(type) ? (dto.level ?? 1) : 1;
    const parentId = this.isHierarchical(type) ? dto.parentId : undefined;

    return this.categoryRepo.create({
      type,
      code: dto.code.trim(),
      name: dto.name.trim(),
      level,
      status: dto.status !== undefined ? dto.status : true,
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
    });
  }

  // 4. Cập nhật
  async update(id: number, dto: UpdateCategoryDto) {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) throw new NotFoundException('Không tìm thấy danh mục');

    if (dto.parentId) {
      const parent = await this.categoryRepo.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Không tìm thấy danh mục cha');
      if (parent.type !== existing.type)
        throw new BadRequestException('Danh mục cha phải cùng loại (type)');
      if (dto.parentId === id)
        throw new BadRequestException('Danh mục không thể là cha của chính nó');
    }

    return this.categoryRepo.update(id, {
      name: dto.name?.trim(),
      level: dto.level,
      status: dto.status,
      ...(dto.parentId !== undefined
        ? {
            parent: dto.parentId
              ? { connect: { id: dto.parentId } }
              : { disconnect: true },
          }
        : {}),
    });
  }

  // 5. Xóa
  async delete(id: number) {
    const existing = await this.categoryRepo.findById(id);
    if (!existing) throw new NotFoundException('Không tìm thấy danh mục');

    const childCount = await this.categoryRepo.countChildren(id);
    if (childCount > 0)
      throw new BadRequestException(
        'Không thể xóa danh mục đang có danh mục con',
      );

    const hasUsage = await this.categoryRepo.hasAccidentCases(id);
    if (hasUsage)
      throw new BadRequestException(
        'Không thể xóa danh mục này vì đang được sử dụng trong báo cáo tai nạn',
      );

    return this.categoryRepo.delete(id);
  }

  // 6. Import từ file Excel/CSV
  async importFromFile(file: Express.Multer.File) {
    if (!file?.buffer)
      throw new BadRequestException('Vui lòng chọn file tải lên');

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException(
        'File không đọc được, vui lòng kiểm tra định dạng',
      );
    }

    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
    );

    if (rows.length === 0)
      throw new BadRequestException('File không có dữ liệu');

    // Hàm tìm cột linh hoạt theo tên tiếng Việt/Anh
    const findCol = (row: Record<string, unknown>, candidates: string[]) =>
      Object.keys(row).find((k) => candidates.includes(k.toLowerCase().trim()));

    const validTypes = Object.values(CategoryType);
    let count = 0;

    for (const row of rows) {
      const typeKey = findCol(row, [
        'type',
        'loại',
        'loai',
        'loại danh mục',
        'loai danh muc',
      ]);
      const codeKey = findCol(row, ['code', 'mã', 'ma', 'mã số', 'ma so']);
      const nameKey = findCol(row, [
        'name',
        'tên',
        'ten',
        'tên danh mục',
        'ten danh muc',
      ]);
      const statusKey = findCol(row, ['status', 'trạng thái', 'trang thai']);
      const levelKey = findCol(row, ['level', 'cấp', 'cap']);
      const parentCodeKey = findCol(row, ['parent_code', 'mã cha', 'ma cha']);

      if (!typeKey || !codeKey || !nameKey) continue;

      const rawType = String(row[typeKey]).trim().toUpperCase();
      const rawCode = String(row[codeKey]).trim();
      const rawName = String(row[nameKey]).trim();

      if (!rawType || !rawCode || !rawName) continue;
      if (!validTypes.includes(rawType as CategoryType)) continue;

      const type = rawType as CategoryType;

      let status = true;
      if (statusKey && row[statusKey] !== undefined) {
        const s = (row[statusKey] as string | number | boolean)
          .toString()
          .toLowerCase()
          .trim();
        if (['không', 'khong', 'inactive', 'false', '0', 'no'].includes(s))
          status = false;
      }

      const level = levelKey && row[levelKey] ? Number(row[levelKey]) : 1;

      let parentId: number | undefined;
      if (parentCodeKey && row[parentCodeKey]) {
        const parentCode = (row[parentCodeKey] as string | number)
          .toString()
          .trim();
        const parentRecord = await this.categoryRepo.findByTypeAndCode(
          type,
          parentCode,
        );
        if (parentRecord) parentId = parentRecord.id;
      }

      await this.categoryRepo.upsert(
        type,
        rawCode,
        rawName,
        status,
        parentId,
        level,
      );
      count++;
    }

    return {
      message: `Đã nhập thành công ${count} bản ghi`,
      importedCount: count,
    };
  }

  // 7. Xuất ra file Excel
  async exportExcel(filters: {
    type?: CategoryType;
    code?: string;
    name?: string;
    status?: boolean;
  }) {
    const categories = await this.categoryRepo.findAll(filters);

    const data = categories.map((c) => ({
      'Loại danh mục': c.type,
      'Mã danh mục': c.code,
      'Tên danh mục': c.name,
      'Mã danh mục cha': c.parent?.code || '',
      Cấp: c.level,
      'Trạng thái': c.status ? 'Sử dụng' : 'Không sử dụng',
      'Ngày tạo': c.createdAt.toLocaleString('vi-VN'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh_muc');

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    }) as Buffer;
    const fileName = `Danh_muc_${filters.type || 'Tat_ca'}.xlsx`;

    return { buffer, fileName };
  }
}
