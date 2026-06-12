import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.seed();
  }

  private async seed() {
    try {
      // 1. Seed default roles
      const roles = [
        { code: 'ADMIN', name: 'Quản trị viên' },
        { code: 'MANAGER', name: 'Quản lý' },
        { code: 'STAFF', name: 'Nhân viên nghiệp vụ' },
        { code: 'ENTERPRISE', name: 'Doanh nghiệp' },
      ];
      for (const role of roles) {
        await this.role.upsert({
          where: { code: role.code },
          update: { name: role.name },
          create: { code: role.code, name: role.name },
        });
      }

      // 2. Seed default Department User (Sở)
      const deptUsername = 'so_laodong';
      const existingDept = await this.user.findUnique({
        where: { username: deptUsername },
      });
      if (!existingDept) {
        const adminRole = await this.role.findUnique({
          where: { code: 'ADMIN' },
        });
        if (adminRole) {
          const argon2 = await import('argon2');
          const hashedPassword = await argon2.hash('password123');
          await this.user.create({
            data: {
              username: deptUsername,
              email: 'so_laodong@example.com',
              passwordHash: hashedPassword,
              fullName: 'Sở Lao động - Thương binh và Xã hội',
              roleId: adminRole.id,
              isActive: true,
            },
          });
          console.log(
            '✅ Seeded default Department user: so_laodong / password123',
          );
        }
      }

      console.log('✅ Completed database seed checks');
    } catch (error) {
      console.error('❌ Failed to seed database:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
