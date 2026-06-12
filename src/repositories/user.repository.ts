import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { QueryUserDto } from '../dto/user/query_user.dto';
import { contain } from 'supertest/lib/cookies';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) { }

  async findUniqueByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true, enterpriseProfile: true },
    });
  }

  async findEnterpriseByTaxCode(taxCode: string) {
    return this.prisma.enterprise.findUnique({
      where: { taxCode },
    });
  }

  async findUniqueByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: { role: true, enterpriseProfile: true },
    });
  }

  async findUniqueById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true, enterpriseProfile: true },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({
      data,
      include: { role: true, enterpriseProfile: true },
    });
  }

  async update(id: number, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true, enterpriseProfile: true },
    });
  }

  async findAll(query: QueryUserDto) {
    const { fullName, username, email, roleId, isActive, position, page = 1, limit = 10 } = query;
    return this.prisma.user.findMany({
      where: {
        fullName: fullName ? { contains: fullName, mode: Prisma.QueryMode.insensitive } : undefined,
        username: username ? { contains: username, mode: Prisma.QueryMode.insensitive } : undefined,
        email: email ? { contains: email, mode: Prisma.QueryMode.insensitive } : undefined,

        // Nếu chọn lọc roleId thì lấy roleId đó, nếu không chọn thì lấy tất cả loại trừ ENTERPRISE (theo code)
        roleId: roleId ? roleId : undefined,
        role: roleId ? undefined : {
          code: { not: 'ENTERPRISE' },
        },

        isActive,
        position: position ? { contains: position, mode: Prisma.QueryMode.insensitive } : undefined,
      },
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async countAll(query: QueryUserDto) {
    const { fullName, username, email, roleId, isActive, position } = query;
    return this.prisma.user.count({
      where: {
        fullName: fullName ? { contains: fullName, mode: Prisma.QueryMode.insensitive } : undefined,
        username: username ? { contains: username, mode: Prisma.QueryMode.insensitive } : undefined,
        email: email ? { contains: email, mode: Prisma.QueryMode.insensitive } : undefined,

        // Loại trừ ENTERPRISE khi không lọc vai trò (theo code)
        roleId: roleId ? roleId : undefined,
        role: roleId ? undefined : {
          code: { not: 'ENTERPRISE' },
        },

        isActive,
        position: position ? { contains: position, mode: Prisma.QueryMode.insensitive } : undefined,
      }
    });
  }


}
