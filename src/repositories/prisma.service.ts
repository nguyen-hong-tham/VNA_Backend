import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
        { code: 'STAFF', name: 'Nhân viên' },
      ];
      for (const role of roles) {
        await this.role.upsert({
          where: { code: role.code },
          update: {},
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

      // 3. Seed default Business Types (Loại hình kinh doanh)
      const businessTypes = [
        { code: 'CP', name: 'Công ty Cổ phần' },
        { code: 'TNHH1', name: 'Công ty TNHH 1 Thành viên' },
        { code: 'TNHH2', name: 'Công ty TNHH 2 Thành viên trở lên' },
        { code: 'DNTN', name: 'Doanh nghiệp tư nhân' },
        { code: 'HTX', name: 'Hợp tác xã' },
      ];
      for (const bt of businessTypes) {
        await this.businessType.upsert({
          where: { code: bt.code },
          update: {},
          create: { code: bt.code, name: bt.name },
        });
      }

      // 4. Seed default Business Fields (Ngành nghề kinh doanh)
      const businessFields = [
        { code: 'CNTT', name: 'Sản xuất phần mềm và Dịch vụ CNTT' },
        { code: 'CKCT', name: 'Cơ khí chế tạo & Lắp ráp' },
        { code: 'DMGD', name: 'Dệt may và Giày da' },
        { code: 'XD', name: 'Xây dựng công trình' },
        { code: 'CBTPDB', name: 'Chế biến thực phẩm và Đồ uống' },
        { code: 'TMDV', name: 'Thương mại & Dịch vụ' },
      ];
      for (const bf of businessFields) {
        await this.businessField.upsert({
          where: { code: bf.code },
          update: {},
          create: { code: bf.code, name: bf.name, level: 1 },
        });
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
