import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

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
}
