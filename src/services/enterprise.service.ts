import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { EnterpriseStatus } from '@prisma/client';
import { EnterpriseRepository } from '../repositories/enterprise.repository';
import { BusinessTypeRepository } from '../repositories/business-type.repository';
import { BusinessFieldRepository } from '../repositories/business-field.repository';
import { UserRepository } from '../repositories/user.repository';
import { PrismaService } from '../repositories/prisma.service';
import { CreateEnterpriseDto } from '../dto/create-enterprise.dto';
import { UpdateEnterpriseDto } from '../dto/update-enterprise.dto';
import { ChangeEnterprisePasswordDto } from '../dto/change-enterprise-password.dto';
import { ConfirmImportDto } from '../dto/confirm-import.dto';

@Injectable()
export class EnterpriseService {
  constructor(
    private enterpriseRepo: EnterpriseRepository,
    private businessTypeRepo: BusinessTypeRepository,
    private businessFieldRepo: BusinessFieldRepository,
    private userRepo: UserRepository,
    private prisma: PrismaService,
  ) {}

  async findAll(
    filters: {
      search?: string;
      businessTypeId?: number;
      businessFieldId?: number;
      wardId?: number;
      status?: EnterpriseStatus;
    },
    pagination: { page: number; limit: number },
  ) {
    return this.enterpriseRepo.findAll(filters, pagination);
  }

  async findById(id: number) {
    const record = await this.enterpriseRepo.findById(id);
    if (!record) {
      throw new NotFoundException('Không tìm thấy thông tin doanh nghiệp');
    }
    return record;
  }

  async create(dto: CreateEnterpriseDto) {
    if (dto.licenseIssueDate) {
      const issueDate = new Date(dto.licenseIssueDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (issueDate > today) {
        throw new BadRequestException(
          'Ngày cấp giấy phép kinh doanh không được là ngày tương lai',
        );
      }
    }

    // 1. Kiểm tra duy nhất mã số thuế
    const taxCode = dto.taxCode.trim();
    const existingEnt = await this.enterpriseRepo.findByTaxCode(taxCode);
    if (existingEnt) {
      throw new ConflictException(
        'Mã số thuế này đã được đăng ký trong hệ thống',
      );
    }

    // 2. Kiểm tra tài khoản đăng nhập (trùng với MST)
    const existingUser = await this.userRepo.findUniqueByUsername(taxCode);
    if (existingUser) {
      throw new ConflictException(
        'Tài khoản đăng nhập trùng với mã số thuế này đã tồn tại',
      );
    }

    // Kiểm tra duy nhất số giấy phép kinh doanh
    const licenseNum = dto.licenseNumber ? dto.licenseNumber.trim() : taxCode;
    const existingLicense =
      await this.enterpriseRepo.findByLicenseNumber(licenseNum);
    if (existingLicense) {
      throw new ConflictException(
        'Số giấy phép kinh doanh này đã tồn tại trong hệ thống',
      );
    }

    // Kiểm tra duy nhất email của doanh nghiệp
    const cleanEmail = dto.email.trim();
    const existingEmail = await this.prisma.enterprise.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      throw new ConflictException(
        'Email này đã được sử dụng bởi một doanh nghiệp khác',
      );
    }

    // Kiểm tra duy nhất email của người dùng
    const existingUserEmail = await this.userRepo.findUniqueByEmail(cleanEmail);
    if (existingUserEmail) {
      throw new ConflictException(
        'Email này đã được sử dụng bởi một tài khoản khác',
      );
    }

    // 3. Kiểm tra loại hình kinh doanh
    const businessType = await this.businessTypeRepo.findById(
      dto.businessTypeId,
    );
    if (!businessType) {
      throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    }
    if (!businessType.status) {
      throw new BadRequestException(
        'Loại hình kinh doanh này đang ngưng hoạt động',
      );
    }

    // 4. Kiểm tra ngành nghề kinh doanh
    const businessField = await this.businessFieldRepo.findById(
      dto.businessFieldId,
    );
    if (!businessField) {
      throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
    }
    if (!businessField.status) {
      throw new BadRequestException(
        'Ngành nghề kinh doanh này đang ngưng hoạt động',
      );
    }
    if (businessField.level !== 4) {
      throw new BadRequestException(
        'Ngành nghề kinh doanh được chọn phải là cấp 4',
      );
    }

    // 5. Lấy vai trò ENTERPRISE
    const role = await this.prisma.role.findUnique({
      where: { code: 'ENTERPRISE' },
    });
    if (!role) {
      throw new NotFoundException(
        'Không tìm thấy vai trò ENTERPRISE trong hệ thống',
      );
    }

    // 6. Mã hóa mật khẩu mặc định (12345678)
    const passwordHash = await bcrypt.hash('12345678', 10);

    // 7. Tạo payload cho User (địa chỉ ĐKKD)
    const userPayload = {
      username: taxCode,
      passwordHash,
      fullName: dto.representativeName ? dto.representativeName.trim() : null,
      email: dto.email.trim(),
      roleId: role.id,
      isActive: true,
      provinceId: dto.provinceId,
      wardId: dto.wardId,
      address: dto.registeredAddress ? dto.registeredAddress.trim() : null,
    };

    // 8. Tạo payload cho Enterprise (Sở tạo nên được phê duyệt APPROVED luôn. Cột province/ward ở bảng Enterprise đại diện cho Hoạt động KD)
    const enterprisePayload = {
      taxCode,
      licenseNumber: dto.licenseNumber ? dto.licenseNumber.trim() : taxCode,
      licenseIssueDate: dto.licenseIssueDate
        ? new Date(dto.licenseIssueDate)
        : null,
      name: dto.name.trim(),
      englishName: dto.englishName ? dto.englishName.trim() : null,
      businessTypeId: dto.businessTypeId,
      businessFieldId: dto.businessFieldId,
      provinceId: dto.provinceIdActivity || null,
      wardId: dto.wardIdActivity || null,
      registeredAddress: dto.registeredAddress
        ? dto.registeredAddress.trim()
        : null,
      operatingAddress: dto.operatingAddress
        ? dto.operatingAddress.trim()
        : null,
      email: dto.email.trim(),
      officePhone: dto.officePhone ? dto.officePhone.trim() : null,
      representativeName: dto.representativeName
        ? dto.representativeName.trim()
        : null,
      representativePhone: dto.representativePhone
        ? dto.representativePhone.trim()
        : null,
      status: EnterpriseStatus.APPROVED,
    };

    // 9. Chuẩn bị tài liệu đính kèm
    const documentsPayload = dto.documents
      ? dto.documents.map((doc) => ({
          documentName: doc.documentName.trim(),
          documentType: doc.documentType,
          fileName: doc.fileName.trim(),
          filePath: doc.filePath.trim(),
          mimeType: doc.mimeType ? doc.mimeType.trim() : null,
          fileSize: doc.fileSize || null,
        }))
      : [];

    return this.enterpriseRepo.create({
      enterprise: enterprisePayload,
      user: userPayload,
      documents: documentsPayload,
    });
  }

  async update(id: number, dto: UpdateEnterpriseDto) {
    if (dto.licenseIssueDate) {
      const issueDate = new Date(dto.licenseIssueDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (issueDate > today) {
        throw new BadRequestException(
          'Ngày cấp giấy phép kinh doanh không được là ngày tương lai',
        );
      }
    }

    const existing = await this.enterpriseRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông tin doanh nghiệp');
    }

    // Kiểm tra loại hình nếu thay đổi
    if (dto.businessTypeId !== undefined) {
      const bt = await this.businessTypeRepo.findById(dto.businessTypeId);
      if (!bt) {
        throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
      }
      if (!bt.status) {
        throw new BadRequestException(
          'Loại hình kinh doanh này đang ngưng hoạt động',
        );
      }
    }

    // Kiểm tra ngành nghề nếu thay đổi
    if (dto.businessFieldId !== undefined) {
      const bf = await this.businessFieldRepo.findById(dto.businessFieldId);
      if (!bf) {
        throw new NotFoundException('Không tìm thấy ngành nghề kinh doanh');
      }
      if (!bf.status) {
        throw new BadRequestException(
          'Ngành nghề kinh doanh này đang ngưng hoạt động',
        );
      }
      if (bf.level !== 4) {
        throw new BadRequestException(
          'Ngành nghề kinh doanh được chọn phải là cấp 4',
        );
      }
    }

    // Kiểm tra duy nhất số giấy phép kinh doanh nếu thay đổi
    if (dto.licenseNumber !== undefined) {
      const cleanLicense = dto.licenseNumber.trim();
      const existingLicense = await this.prisma.enterprise.findFirst({
        where: { licenseNumber: cleanLicense, id: { not: id } },
      });
      if (existingLicense) {
        throw new ConflictException(
          'Số giấy phép kinh doanh này đã tồn tại trong hệ thống',
        );
      }
    }

    // Kiểm tra duy nhất email của doanh nghiệp và người dùng nếu thay đổi
    if (dto.email !== undefined) {
      const cleanEmail = dto.email.trim();
      const existingEmail = await this.prisma.enterprise.findFirst({
        where: { email: cleanEmail, id: { not: id } },
      });
      if (existingEmail) {
        throw new ConflictException(
          'Email này đã được sử dụng bởi một doanh nghiệp khác',
        );
      }
      const existingUserEmail = await this.prisma.user.findFirst({
        where: { email: cleanEmail, enterpriseProfile: { id: { not: id } } },
      });
      if (existingUserEmail) {
        throw new ConflictException(
          'Email này đã được sử dụng bởi một tài khoản khác',
        );
      }
    }

    // Xây dựng payload cập nhật cho Enterprise
    const enterpriseUpdate: any = {};
    if (dto.name !== undefined) enterpriseUpdate.name = dto.name.trim();
    if (dto.licenseNumber !== undefined)
      enterpriseUpdate.licenseNumber = dto.licenseNumber.trim();
    if (dto.licenseIssueDate !== undefined)
      enterpriseUpdate.licenseIssueDate = dto.licenseIssueDate;
    if (dto.businessTypeId !== undefined)
      enterpriseUpdate.businessTypeId = dto.businessTypeId;
    if (dto.businessFieldId !== undefined)
      enterpriseUpdate.businessFieldId = dto.businessFieldId;
    if (dto.provinceIdActivity !== undefined)
      enterpriseUpdate.provinceId = dto.provinceIdActivity;
    if (dto.wardIdActivity !== undefined)
      enterpriseUpdate.wardId = dto.wardIdActivity;
    if (dto.registeredAddress !== undefined)
      enterpriseUpdate.registeredAddress = dto.registeredAddress
        ? dto.registeredAddress.trim()
        : null;
    if (dto.operatingAddress !== undefined)
      enterpriseUpdate.operatingAddress = dto.operatingAddress
        ? dto.operatingAddress.trim()
        : null;
    if (dto.englishName !== undefined)
      enterpriseUpdate.englishName = dto.englishName
        ? dto.englishName.trim()
        : null;
    if (dto.email !== undefined) enterpriseUpdate.email = dto.email.trim();
    if (dto.officePhone !== undefined)
      enterpriseUpdate.officePhone = dto.officePhone
        ? dto.officePhone.trim()
        : null;
    if (dto.representativeName !== undefined)
      enterpriseUpdate.representativeName = dto.representativeName
        ? dto.representativeName.trim()
        : null;
    if (dto.representativePhone !== undefined)
      enterpriseUpdate.representativePhone = dto.representativePhone
        ? dto.representativePhone.trim()
        : null;

    // Xây dựng cập nhật cho linked User (email / representativeName / ĐKKD address)
    const userUpdate: any = {};
    if (dto.representativeName !== undefined)
      userUpdate.fullName = dto.representativeName
        ? dto.representativeName.trim()
        : null;
    if (dto.email !== undefined) userUpdate.email = dto.email.trim();
    if (dto.provinceId !== undefined) userUpdate.provinceId = dto.provinceId;
    if (dto.wardId !== undefined) userUpdate.wardId = dto.wardId;
    if (dto.registeredAddress !== undefined)
      userUpdate.address = dto.registeredAddress
        ? dto.registeredAddress.trim()
        : null;

    // Tài liệu đính kèm
    const documentsPayload = dto.documents
      ? dto.documents.map((doc) => ({
          documentName: doc.documentName.trim(),
          documentType: doc.documentType,
          fileName: doc.fileName.trim(),
          filePath: doc.filePath.trim(),
          mimeType: doc.mimeType ? doc.mimeType.trim() : null,
          fileSize: doc.fileSize || null,
        }))
      : undefined;

    return this.enterpriseRepo.update(id, {
      enterprise: enterpriseUpdate,
      user: Object.keys(userUpdate).length > 0 ? userUpdate : undefined,
      documents: documentsPayload,
    });
  }

  async updateStatus(
    id: number,
    status: EnterpriseStatus,
    approvedBy?: number,
  ) {
    const existing = await this.enterpriseRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông tin doanh nghiệp');
    }
    return this.enterpriseRepo.updateStatus(id, status, approvedBy);
  }

  async changePassword(dto: ChangeEnterprisePasswordDto) {
    const user = await this.userRepo.findUniqueByUsername(dto.username.trim());
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản doanh nghiệp này');
    }

    if (user.role.code !== 'ENTERPRISE') {
      throw new BadRequestException(
        'Tài khoản được chọn không thuộc vai trò doanh nghiệp',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(user.id, { passwordHash });

    return {
      message: 'Thay đổi mật khẩu doanh nghiệp thành công',
      username: user.username,
    };
  }

  async importPreview(file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file tải lên');
    }

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (rows.length === 0) {
        throw new BadRequestException('File Excel không có dữ liệu');
      }

      // Load cache các dữ liệu cần kiểm tra
      const businessTypes = await this.businessTypeRepo.findAll({});
      const businessFields = await this.businessFieldRepo.findAll({ level: 4 });
      const role = await this.prisma.role.findUnique({
        where: { code: 'ENTERPRISE' },
      });

      if (!role) {
        throw new NotFoundException(
          'Không tìm thấy vai trò ENTERPRISE trong hệ thống',
        );
      }

      let validCount = 0;
      let invalidCount = 0;
      const results: {
        rowNumber: number;
        isValid: boolean;
        errors: string[];
        data: any | null;
      }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2; // Dòng thực tế trong excel (bỏ qua header)
        const rowErrors: string[] = [];

        // Phân tích header linh hoạt
        const nameKey = Object.keys(row).find((k) =>
          [
            'tên doanh nghiệp',
            'ten doanh nghiep',
            'tên',
            'ten',
            'name',
            'tên công ty',
            'ten cong ty',
          ].includes(k.toLowerCase().trim()),
        );
        const taxCodeKey = Object.keys(row).find((k) =>
          ['mã số thuế', 'ma so thue', 'taxcode', 'tax_code', 'mst'].includes(
            k.toLowerCase().trim(),
          ),
        );
        const licenseKey = Object.keys(row).find((k) =>
          [
            'số giấy phép',
            'so giay phep',
            'license number',
            'license_number',
            'gpkd',
            'số gpkd',
          ].includes(k.toLowerCase().trim()),
        );
        const licenseDateKey = Object.keys(row).find((k) =>
          [
            'ngày cấp',
            'ngay cap',
            'license date',
            'license_issue_date',
            'ngay_cap',
          ].includes(k.toLowerCase().trim()),
        );
        const btKey = Object.keys(row).find((k) =>
          [
            'loại hình kinh doanh',
            'loai hinh kinh doanh',
            'business type',
            'mã loại hình',
            'ma loai hinh',
            'loại hình',
            'loai hinh',
          ].includes(k.toLowerCase().trim()),
        );
        const bfKey = Object.keys(row).find((k) =>
          [
            'ngành nghề kinh doanh',
            'nganh nghe kinh doanh',
            'business field',
            'mã ngành',
            'ma nganh',
            'ngành nghề',
            'nganh nghe',
          ].includes(k.toLowerCase().trim()),
        );
        const provinceKey = Object.keys(row).find((k) =>
          [
            'tỉnh',
            'thành phố',
            'tinh',
            'thanh pho',
            'province',
            'mã tỉnh',
            'ma tinh',
          ].includes(k.toLowerCase().trim()),
        );
        const wardKey = Object.keys(row).find((k) =>
          [
            'phường',
            'xã',
            'phuong',
            'xa',
            'ward',
            'mã phường',
            'ma phuong',
          ].includes(k.toLowerCase().trim()),
        );
        const regAddrKey = Object.keys(row).find((k) =>
          [
            'địa chỉ',
            'dia chi',
            'address',
            'địa chỉ đăng ký',
            'dia chi dang ky',
          ].includes(k.toLowerCase().trim()),
        );
        const optAddrKey = Object.keys(row).find((k) =>
          [
            'địa chỉ hoạt động',
            'dia chi hoat dong',
            'địa điểm kinh doanh',
            'dia diem kinh doanh',
            'operating address',
          ].includes(k.toLowerCase().trim()),
        );
        const engNameKey = Object.keys(row).find((k) =>
          [
            'tên tiếng nước ngoài',
            'ten tieng nuoc ngoai',
            'english name',
            'ten tieng anh',
          ].includes(k.toLowerCase().trim()),
        );
        const emailKey = Object.keys(row).find((k) =>
          ['email', 'thư điện tử', 'thu dien tu'].includes(
            k.toLowerCase().trim(),
          ),
        );
        const officePhoneKey = Object.keys(row).find((k) =>
          [
            'số điện thoại cơ quan',
            'so dien thoai co quan',
            'sđt cơ quan',
            'sdt co quan',
            'office phone',
          ].includes(k.toLowerCase().trim()),
        );
        const repNameKey = Object.keys(row).find((k) =>
          [
            'người đứng đầu',
            'nguoi dung dau',
            'đại diện',
            'dai dien',
            'representative',
            'người đại diện',
          ].includes(k.toLowerCase().trim()),
        );
        const repPhoneKey = Object.keys(row).find((k) =>
          [
            'sđt người đứng đầu',
            'sdt nguoi dung dau',
            'sđt đại diện',
            'sdt dai dien',
            'representative phone',
          ].includes(k.toLowerCase().trim()),
        );

        if (
          !nameKey ||
          !taxCodeKey ||
          !btKey ||
          !bfKey ||
          !emailKey ||
          !repNameKey ||
          !regAddrKey
        ) {
          rowErrors.push(
            'Thiếu thông tin cột bắt buộc (Tên, MST, Loại hình, Ngành nghề, Email, Người đứng đầu, Địa chỉ đăng ký).',
          );
          invalidCount++;
          results.push({
            rowNumber: rowIndex,
            isValid: false,
            errors: rowErrors,
            data: null,
          });
          continue;
        }

        const name = String(row[nameKey] || '').trim();
        const taxCode = String(row[taxCodeKey] || '').trim();
        const btRaw = String(row[btKey] || '').trim();
        const bfRaw = String(row[bfKey] || '').trim();
        const email = String(row[emailKey] || '').trim();
        const representativeName = String(row[repNameKey] || '').trim();
        const registeredAddress = String(row[regAddrKey] || '').trim();

        if (
          !name ||
          !taxCode ||
          !btRaw ||
          !bfRaw ||
          !email ||
          !representativeName ||
          !registeredAddress
        ) {
          rowErrors.push('Dữ liệu bắt buộc không được để trống.');
        }

        // Kiểm tra định dạng MST (10 đến 15 số)
        if (taxCode && !/^\d{10,15}$/.test(taxCode)) {
          rowErrors.push(
            `Mã số thuế "${taxCode}" không đúng định dạng 10 đến 15 chữ số.`,
          );
        }

        // Kiểm tra email
        if (email && !email.includes('@')) {
          rowErrors.push(`Email "${email}" không đúng định dạng.`);
        }

        // Kiểm tra trùng lặp MST
        if (taxCode && /^\d{10,15}$/.test(taxCode)) {
          const dupEnt = await this.enterpriseRepo.findByTaxCode(taxCode);
          const dupUser = await this.userRepo.findUniqueByUsername(taxCode);
          if (dupEnt || dupUser) {
            rowErrors.push(
              `Doanh nghiệp hoặc tài khoản với MST "${taxCode}" đã tồn tại trong hệ thống.`,
            );
          }
        }

        // Kiểm tra loại hình kinh doanh
        let businessType: any = null;
        if (btRaw) {
          businessType = businessTypes.find(
            (b) =>
              b.code.toLowerCase() === btRaw.toLowerCase() ||
              b.name.toLowerCase() === btRaw.toLowerCase(),
          );
          if (!businessType) {
            rowErrors.push(`Không tìm thấy loại hình kinh doanh "${btRaw}".`);
          } else if (!businessType.status) {
            rowErrors.push(`Loại hình kinh doanh "${btRaw}" đang bị khóa.`);
          }
        }

        // Kiểm tra ngành nghề kinh doanh cấp 4
        let businessField: any = null;
        if (bfRaw) {
          let bfCode = bfRaw;
          if (/^\d+$/.test(bfCode)) {
            bfCode = bfCode.padStart(4, '0');
          }
          businessField = businessFields.find(
            (f) =>
              f.code.toLowerCase() === bfCode.toLowerCase() ||
              f.name.toLowerCase() === bfRaw.toLowerCase(),
          );
          if (!businessField) {
            rowErrors.push(
              `Không tìm thấy ngành nghề kinh doanh cấp 4 "${bfRaw}".`,
            );
          } else if (!businessField.status) {
            rowErrors.push(`Ngành nghề kinh doanh "${bfRaw}" đang bị khóa.`);
          }
        }

        // Đọc các trường không bắt buộc khác
        const licenseNumber = licenseKey
          ? String(row[licenseKey] || '').trim()
          : taxCode;

        // Xử lý ngày cấp giấy phép
        let licenseIssueDate: Date | null = null;
        if (licenseDateKey && row[licenseDateKey] !== undefined) {
          const rawDate = row[licenseDateKey];
          if (typeof rawDate === 'number') {
            licenseIssueDate = new Date((rawDate - 25569) * 86400 * 1000);
          } else {
            const d = new Date(String(rawDate));
            if (!isNaN(d.getTime())) {
              licenseIssueDate = d;
            }
          }
        }

        if (licenseIssueDate) {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (licenseIssueDate > today) {
            rowErrors.push(
              'Ngày cấp giấy phép kinh doanh không được là ngày tương lai.',
            );
          }
        }

        // Province & Ward
        const provinceId = provinceKey
          ? parseInt(String(row[provinceKey] || '0').replace(/\D/g, ''), 10) ||
            79
          : 79;
        const wardId = wardKey
          ? parseInt(String(row[wardKey] || '0').replace(/\D/g, ''), 10) || 1
          : 1;

        const operatingAddress = optAddrKey
          ? String(row[optAddrKey] || '').trim()
          : null;
        const englishName = engNameKey
          ? String(row[engNameKey] || '').trim()
          : null;
        const officePhone = officePhoneKey
          ? String(row[officePhoneKey] || '').trim()
          : null;
        const representativePhone = repPhoneKey
          ? String(row[repPhoneKey] || '').trim()
          : null;

        if (rowErrors.length > 0) {
          invalidCount++;
          results.push({
            rowNumber: rowIndex,
            isValid: false,
            errors: rowErrors,
            data: null,
          });
        } else {
          validCount++;
          results.push({
            rowNumber: rowIndex,
            isValid: true,
            errors: [],
            data: {
              name,
              taxCode,
              licenseNumber,
              licenseIssueDate,
              businessTypeId: businessType.id,
              businessFieldId: businessField.id,
              provinceId,
              wardId,
              registeredAddress,
              operatingAddress,
              englishName,
              email,
              officePhone,
              representativeName,
              representativePhone,
            },
          });
        }
      }

      return {
        totalRows: rows.length,
        validCount,
        invalidCount,
        results,
      };
    } catch (e: any) {
      if (
        e instanceof BadRequestException ||
        e instanceof NotFoundException ||
        e instanceof ConflictException
      ) {
        throw e;
      }
      throw new BadRequestException(`Lỗi khi xử lý file Excel: ${e.message}`);
    }
  }

  async importConfirm(dto: ConfirmImportDto) {
    const role = await this.prisma.role.findUnique({
      where: { code: 'ENTERPRISE' },
    });
    if (!role) {
      throw new NotFoundException(
        'Không tìm thấy vai trò ENTERPRISE trong hệ thống',
      );
    }
    const passwordHash = await bcrypt.hash('12345678', 10);
    let successCount = 0;
    const errors: string[] = [];

    for (const ent of dto.enterprises) {
      try {
        const taxCode = ent.taxCode.trim();

        // Kiểm tra trùng MST
        const dupEnt = await this.enterpriseRepo.findByTaxCode(taxCode);
        const dupUser = await this.userRepo.findUniqueByUsername(taxCode);
        if (dupEnt || dupUser) {
          errors.push(
            `Doanh nghiệp hoặc tài khoản với MST "${taxCode}" đã tồn tại trong hệ thống.`,
          );
          continue;
        }

        // Kiểm tra trùng email
        const cleanEmail = ent.email.trim();
        const existingEmail = await this.prisma.enterprise.findUnique({
          where: { email: cleanEmail },
        });
        const existingUserEmail =
          await this.userRepo.findUniqueByEmail(cleanEmail);
        if (existingEmail || existingUserEmail) {
          errors.push(`Email "${cleanEmail}" đã tồn tại trong hệ thống.`);
          continue;
        }

        const userPayload = {
          username: taxCode,
          passwordHash,
          fullName: ent.representativeName
            ? ent.representativeName.trim()
            : null,
          email: cleanEmail,
          roleId: role.id,
          isActive: true,
        };

        const enterprisePayload = {
          taxCode,
          licenseNumber: ent.licenseNumber ? ent.licenseNumber.trim() : taxCode,
          licenseIssueDate: ent.licenseIssueDate
            ? new Date(ent.licenseIssueDate)
            : null,
          name: ent.name.trim(),
          englishName: ent.englishName ? ent.englishName.trim() : null,
          businessTypeId: ent.businessTypeId,
          businessFieldId: ent.businessFieldId,
          provinceId: ent.provinceId || null,
          wardId: ent.wardId || null,
          registeredAddress: ent.registeredAddress
            ? ent.registeredAddress.trim()
            : null,
          operatingAddress: ent.operatingAddress
            ? ent.operatingAddress.trim()
            : null,
          email: cleanEmail,
          officePhone: ent.officePhone ? ent.officePhone.trim() : null,
          representativeName: ent.representativeName
            ? ent.representativeName.trim()
            : null,
          representativePhone: ent.representativePhone
            ? ent.representativePhone.trim()
            : null,
          status: EnterpriseStatus.APPROVED,
        };

        await this.enterpriseRepo.create({
          enterprise: enterprisePayload,
          user: userPayload,
        });
        successCount++;
      } catch (e: any) {
        errors.push(`Lỗi khi lưu doanh nghiệp "${ent.name}": ${e.message}`);
      }
    }

    return {
      message: `Xác nhận lưu thành công ${successCount} doanh nghiệp vào cơ sở dữ liệu`,
      importedCount: successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async delete(id: number) {
    const existing = await this.enterpriseRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy thông tin doanh nghiệp');
    }
    return this.enterpriseRepo.delete(id);
  }
}
