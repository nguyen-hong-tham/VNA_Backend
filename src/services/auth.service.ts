import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { EmailChangeOtpRepository } from '../repositories/email-change-otp.repository';
import { MailService } from './mail.service';
import { LoginDto } from '../dto/login.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { VerifyEmailChangeDto } from '../dto/verify-email-change.dto';
import { UpdateEmailDto } from '../dto/update-email.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { PrismaService } from '../repositories/prisma.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SupabaseService } from './supabase.service';
@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private passwordResetRepository: PasswordResetRepository,
    private emailChangeOtpRepository: EmailChangeOtpRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  private formatUserResponse(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    if (result.birthDate && result.birthDate instanceof Date) {
      result.birthDate = result.birthDate.toISOString().split('T')[0];
    }
    if (result.enterpriseProfile?.licenseIssueDate instanceof Date) {
      result.enterpriseProfile.licenseIssueDate =
        result.enterpriseProfile.licenseIssueDate.toISOString().split('T')[0];
    }
    return result;
  }

  async login(dto: LoginDto) {
    const username = dto.username!.toLowerCase();
    const user = await this.userRepository.findUniqueByUsername(username);

    if (!user) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password!,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Tài khoản hoặc mật khẩu không đúng. Xin vui lòng thử lại',
      );
    }

    const payload = { sub: user.id, email: user.email };

    // Generate Access Token
    const accessToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key',
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '15m') as any,
    });

    // Generate Refresh Token
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'super_secret_refresh_jwt_key',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
        '7d') as any,
    });

    return {
      message: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      user: this.formatUserResponse(user),
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super_secret_refresh_jwt_key',
      });

      const user = await this.userRepository.findUniqueById(
        payload.sub as number,
      );
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Phiên làm việc không hợp lệ');
      }

      const newPayload = { sub: user.id, email: user.email };
      const accessToken = await this.jwtService.signAsync(newPayload, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'super_secret_jwt_key',
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
          '15m') as any,
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException(
        'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.birthDate) {
      const birthDateObj = new Date(dto.birthDate);
      const today = new Date();
      // Đặt giờ cuối ngày để tránh lệch múi giờ trong ngày hiện tại
      today.setHours(23, 59, 59, 999);
      if (birthDateObj > today) {
        throw new BadRequestException('Ngày sinh không được vượt quá ngày hiện tại');
      }
    }

    const updatedUser = await this.userRepository.update(userId, {
      fullName: dto.fullName !== undefined ? dto.fullName : undefined,
      phone: dto.phone !== undefined ? dto.phone : undefined,
      birthDate:
        dto.birthDate !== undefined
          ? dto.birthDate
            ? new Date(dto.birthDate)
            : null
          : undefined,
      gender: dto.gender !== undefined ? dto.gender : undefined,
      position: dto.position !== undefined ? dto.position : undefined,
      provinceId: dto.provinceId !== undefined ? dto.provinceId : undefined,
      wardId: dto.wardId !== undefined ? dto.wardId : undefined,
      address: dto.address !== undefined ? dto.address : undefined,
      avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : undefined,
    });

    return {
      message: 'Cập nhật thông tin người dùng thành công',
      user: this.formatUserResponse(updatedUser),
    };
  }

  async updateAvatar(userId: number, file: Express.Multer.File) {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const avatarUrl = await this.supabaseService.uploadAvatar(file);

    const updatedUser = await this.userRepository.update(userId, {
      avatarUrl,
    });

    return {
      message: 'Cập nhật ảnh đại diện thành công',
      user: this.formatUserResponse(updatedUser),
      avatarUrl,
    };
  }

  async requestEmailChange(userId: number) {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const email = user.email;
    if (!email) {
      throw new BadRequestException('Tài khoản không có email');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.emailChangeOtpRepository.upsertOtp(
      userId,
      email,
      otp,
      expiresAt,
    );

    // Send email change OTP code
    this.mailService
      .sendEmailChangeOtpEmail(email, user.fullName || user.username, otp)
      .catch(() => {});

    console.log(
      `\n🔑 [DEV ONLY] Mã OTP thay đổi email của ${email} là: ${otp}\n`,
    );

    return { message: 'Gửi email thành công' };
  }

  async verifyEmailChange(userId: number, dto: VerifyEmailChangeDto) {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const record = await this.emailChangeOtpRepository.findByUserId(userId);

    if (!record || record.otp !== dto.otp || new Date() > record.expiresAt) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Generate verified token
    const verificationToken = await this.jwtService.signAsync(
      { sub: userId, type: 'email-change-verified', email: user.email },
      {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          'super_secret_jwt_key',
        expiresIn: '10m',
      },
    );

    await this.emailChangeOtpRepository.deleteByUserId(userId);

    return {
      message: 'Xác thực OTP thành công',
      verificationToken,
    };
  }

  async updateEmail(userId: number, dto: UpdateEmailDto) {
    try {
      const payload = await this.jwtService.verifyAsync(
        dto.verificationToken!,
        {
          secret:
            this.configService.get<string>('JWT_SECRET') ||
            'super_secret_jwt_key',
        },
      );

      if (payload.sub !== userId || payload.type !== 'email-change-verified') {
        throw new BadRequestException('Token xác thực không hợp lệ');
      }

      const newEmail = dto.newEmail!.toLowerCase().trim();

      // Get current user to see current email and if they have a linked enterpriseProfile
      const user = await this.userRepository.findUniqueById(userId);
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      // 1. Kiểm tra trùng với email hiện tại
      if (user.email && user.email.toLowerCase() === newEmail) {
        throw new BadRequestException('Email mới phải khác địa chỉ email hiện tại của bạn');
      }

      // 2. Kiểm tra trùng email trong bảng User (loại trừ chính mình)
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: newEmail, mode: 'insensitive' },
          id: { not: userId },
        },
      });
      if (existingUser) {
        throw new ConflictException('Email này đã được sử dụng bởi một tài khoản khác trong hệ thống');
      }

      // 3. Kiểm tra trùng email trong bảng Enterprise (loại trừ hồ sơ của chính user hiện tại)
      const enterpriseIdToExclude = user.enterpriseProfile?.id;
      const existingEnterprise = await this.prisma.enterprise.findFirst({
        where: {
          email: { equals: newEmail, mode: 'insensitive' },
          ...(enterpriseIdToExclude ? { id: { not: enterpriseIdToExclude } } : {}),
        },
      });
      if (existingEnterprise) {
        throw new ConflictException('Email này đã được sử dụng bởi một doanh nghiệp khác trong hệ thống');
      }

      // Cập nhật đồng bộ email của User và cả Enterprise liên kết nếu có
      const updatedUser = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { email: newEmail },
          include: { role: true, enterpriseProfile: true },
        });

        if (user.enterpriseProfile) {
          await tx.enterprise.update({
            where: { id: user.enterpriseProfile.id },
            data: { email: newEmail },
          });
        }

        return updated;
      });

      return {
        message: 'Thay đổi email thành công',
        user: this.formatUserResponse(updatedUser),
      };
    } catch (e: any) {
      if (
        e instanceof ConflictException ||
        e instanceof BadRequestException ||
        e instanceof NotFoundException
      ) {
        throw e;
      }
      throw new BadRequestException(
        'Token xác thực không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.userRepository.findUniqueById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword!,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.newPassword!, salt);

    await this.userRepository.update(userId, {
      passwordHash: hashedPassword,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  //// Forgot Password

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.userRepository.findUniqueByEmail(email);

    if (!user) {
      throw new NotFoundException(
        'Email chưa được đăng ký. Xin vui lòng thử lại.',
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.passwordResetRepository.upsertOtp(user.id, otp, expiresAt);

    await this.mailService
      .sendPasswordResetOtpEmail(
        email,
        user.fullName || user.username,
        user.username,
        otp,
      )
      .catch(() => {});

    console.log(
      `\n🔑 [DEV ONLY] Mã OTP quên mật khẩu của ${email} là: ${otp}\n`,
    );

    return {
      message: 'Gửi email thành công',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.userRepository.findUniqueByEmail(email);

    if (!user) {
      throw new NotFoundException(
        'Email chưa được đăng ký. Xin vui lòng thử lại.',
      );
    }

    const record = await this.passwordResetRepository.findByUserId(user.id);

    if (!record || record.otp !== dto.otp) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    await this.userRepository.update(user.id, {
      passwordHash: hashedPassword,
    });

    await this.passwordResetRepository.deleteByUserId(user.id);

    return {
      message: 'Khôi phục mật khẩu thành công',
    };
  }
}
