import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { EnterpriseRepository } from '../repositories/enterprise.repository';
import { MailService } from './mail.service';
import { PrismaService } from '../repositories/prisma.service';
import {
  RegisterEnterpriseDto,
  VerifyRegistrationOtpDto,
  ConfirmRegistrationDto,
} from '../dto/register-enterprise.dto';

@Injectable()
export class EnterpriseRegistrationService {
  constructor(
    private userRepository: UserRepository,
    private enterpriseRepository: EnterpriseRepository,
    private mailService: MailService,
    private prisma: PrismaService,
  ) {}

  async registerEnterpriseRequest(dto: RegisterEnterpriseDto) {
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

    const taxCode = dto.taxCode.trim();
    const cleanEmail = dto.email.trim();
    const licenseNum = dto.licenseNumber ? dto.licenseNumber.trim() : taxCode;

    // 1. Kiểm tra các xung đột với các tài khoản ĐANG HOẠT ĐỘNG (isActive = true)
    const activeUserByUsername = await this.prisma.user.findFirst({
      where: { username: taxCode, isActive: true },
    });
    if (activeUserByUsername) {
      throw new ConflictException(
        'Tài khoản đăng nhập trùng với mã số thuế này đã tồn tại',
      );
    }

    const activeUserByEmail = await this.prisma.user.findFirst({
      where: { email: cleanEmail, isActive: true },
    });
    if (activeUserByEmail) {
      throw new ConflictException(
        'Email này đã được sử dụng bởi một tài khoản khác',
      );
    }

    const activeEnterpriseByTaxCode = await this.prisma.enterprise.findFirst({
      where: { taxCode, user: { isActive: true } },
    });
    if (activeEnterpriseByTaxCode) {
      throw new ConflictException(
        'Mã số thuế này đã được đăng ký trong hệ thống',
      );
    }

    const activeEnterpriseByLicense = await this.prisma.enterprise.findFirst({
      where: { licenseNumber: licenseNum, user: { isActive: true } },
    });
    if (activeEnterpriseByLicense) {
      throw new ConflictException(
        'Số giấy phép kinh doanh này đã tồn tại trong hệ thống',
      );
    }

    const activeEnterpriseByEmail = await this.prisma.enterprise.findFirst({
      where: { email: cleanEmail, user: { isActive: true } },
    });
    if (activeEnterpriseByEmail) {
      throw new ConflictException(
        'Email này đã được sử dụng bởi một doanh nghiệp khác',
      );
    }

    // 2. Dọn dẹp các bản ghi nháp/chưa kích hoạt (isActive = false) trùng lặp để tránh lỗi unique constraint
    const inactiveUsers = await this.prisma.user.findMany({
      where: {
        isActive: false,
        OR: [
          { username: taxCode },
          { email: cleanEmail },
          { enterpriseProfile: { taxCode } },
          { enterpriseProfile: { licenseNumber: licenseNum } },
          { enterpriseProfile: { email: cleanEmail } },
        ],
      },
    });

    if (inactiveUsers.length > 0) {
      const userIds = inactiveUsers.map((u) => u.id);
      await this.prisma.$transaction(async (tx) => {
        await tx.registerOtp.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.passwordReset.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.emailChangeOtp.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.enterprise.deleteMany({
          where: { userId: { in: userIds } },
        });
        await tx.user.deleteMany({
          where: { id: { in: userIds } },
        });
      });
    }

    // 3. Kiểm tra loại hình kinh doanh (giống Thêm doanh nghiệp)
    const businessType = await this.prisma.businessType.findUnique({
      where: { id: dto.businessTypeId },
    });
    if (!businessType) {
      throw new NotFoundException('Không tìm thấy loại hình kinh doanh');
    }
    if (!businessType.status) {
      throw new BadRequestException(
        'Loại hình kinh doanh này đang ngưng hoạt động',
      );
    }

    // 4. Kiểm tra ngành nghề kinh doanh (giống Thêm doanh nghiệp)
    const businessField = await this.prisma.businessField.findUnique({
      where: { id: dto.businessFieldId },
    });
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

    // 5. Kiểm tra vai trò ENTERPRISE
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
      email: cleanEmail,
      roleId: role.id,
      isActive: false, // Tài khoản mới đăng ký sẽ chưa kích hoạt
      provinceId: dto.provinceId,
      wardId: dto.wardId,
      address: dto.registeredAddress ? dto.registeredAddress.trim() : null,
    };

    // 8. Tạo payload cho Enterprise (Đăng ký tự do sẽ ở trạng thái PENDING)
    const enterprisePayload = {
      taxCode,
      licenseNumber: licenseNum,
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
      email: cleanEmail,
      officePhone: dto.officePhone ? dto.officePhone.trim() : null,
      representativeName: dto.representativeName
        ? dto.representativeName.trim()
        : null,
      representativePhone: dto.representativePhone
        ? dto.representativePhone.trim()
        : null,
      status: 'PENDING' as any, // Trạng thái chờ duyệt
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

    // 10. Tạo các bản ghi qua EnterpriseRepository giống hệt như "Thêm doanh nghiệp"
    const createdEnterprise = await this.enterpriseRepository.create({
      enterprise: enterprisePayload,
      user: userPayload,
      documents: documentsPayload,
    });

    if (!createdEnterprise) {
      throw new BadRequestException('Không thể tạo thông tin doanh nghiệp');
    }

    // 11. Tạo OTP đăng ký
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

    await this.prisma.registerOtp.create({
      data: {
        userId: createdEnterprise.userId,
        otp,
        expiresAt,
      },
    });

    // 12. Gửi email chứa mã OTP xác thực
    await this.mailService.sendEnterpriseRegistrationOtpEmail(
      cleanEmail,
      dto.name.trim(),
      otp,
    );

    console.log(
      `\n🔑 [DEV ONLY] Mã OTP đăng ký doanh nghiệp của ${cleanEmail} là: ${otp}\n`,
    );

    return {
      message:
        'Gửi yêu cầu đăng ký thành công. Vui lòng kiểm tra email để nhận mã OTP xác thực.',
      taxCode,
    };
  }

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto) {
    const user = await this.userRepository.findUniqueByUsername(
      dto.taxCode.trim(),
    );
    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy thông tin đăng ký doanh nghiệp',
      );
    }

    const otpRecord = await this.prisma.registerOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !otpRecord ||
      otpRecord.otp !== dto.otp ||
      new Date() > otpRecord.expiresAt
    ) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Đánh dấu OTP đã xác thực thành công
    await this.prisma.registerOtp.update({
      where: { id: otpRecord.id },
      data: { isVerified: true },
    });

    // Lấy thông tin chi tiết doanh nghiệp trả về màn hình xác nhận thông tin
    const enterprise = await this.prisma.enterprise.findUnique({
      where: { userId: user.id },
      include: {
        businessType: true,
        businessField: true,
        documents: true,
      },
    });

    return {
      message: 'Xác thực OTP thành công',
      taxCode: dto.taxCode,
      enterprise,
    };
  }

  async confirmRegistration(dto: ConfirmRegistrationDto) {
    const user = await this.userRepository.findUniqueByUsername(
      dto.taxCode.trim(),
    );
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin đăng ký');
    }

    if (user.isActive) {
      throw new ConflictException('Tài khoản doanh nghiệp đã được kích hoạt');
    }

    const otpRecord = await this.prisma.registerOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || !otpRecord.isVerified) {
      throw new BadRequestException(
        'Yêu cầu chưa được xác thực OTP. Vui lòng thực hiện xác thực trước.',
      );
    }

    // Kích hoạt tài khoản và xóa OTP
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });

      await tx.registerOtp.deleteMany({
        where: { userId: user.id },
      });
    });

    return {
      message: 'Xác nhận đăng ký doanh nghiệp thành công',
      username: user.username,
      password: '12345678', // Mật khẩu mặc định hiển thị pop up
    };
  }
}
