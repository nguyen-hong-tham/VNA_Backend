import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PasswordResetRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: number) {
    return this.prisma.passwordReset.findFirst({
      where: { userId, isVerified: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertOtp(userId: number, otp: string, expiresAt: Date) {
    // Delete any previous OTPs for this user first
    await this.prisma.passwordReset.deleteMany({ where: { userId } });

    return this.prisma.passwordReset.create({
      data: {
        userId,
        otp,
        expiresAt,
      },
    });
  }

  async deleteByUserId(userId: number) {
    return this.prisma.passwordReset
      .deleteMany({ where: { userId } })
      .catch(() => null);
  }
}
