import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class EmailChangeOtpRepository {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: number) {
    return this.prisma.emailChangeOtp.findFirst({
      where: { userId, isVerified: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertOtp(
    userId: number,
    newEmail: string,
    otp: string,
    expiresAt: Date,
  ) {
    // Delete any previous OTPs for this user first
    await this.prisma.emailChangeOtp.deleteMany({ where: { userId } });

    return this.prisma.emailChangeOtp.create({
      data: {
        userId,
        newEmail,
        otp,
        expiresAt,
      },
    });
  }

  async deleteByUserId(userId: number) {
    return this.prisma.emailChangeOtp
      .deleteMany({ where: { userId } })
      .catch(() => null);
  }
}
