import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class BusinessTypeRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { code?: string; name?: string; status?: boolean }) {
    const where: Prisma.BusinessTypeWhereInput = {};

    if (filters.code) {
      where.code = {
        contains: filters.code,
        mode: 'insensitive',
      };
    }

    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    return this.prisma.businessType.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.businessType.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return this.prisma.businessType.findUnique({
      where: { code },
    });
  }

  async create(data: Prisma.BusinessTypeCreateInput) {
    return this.prisma.businessType.create({
      data,
    });
  }

  async update(id: number, data: Prisma.BusinessTypeUpdateInput) {
    return this.prisma.businessType.update({
      where: { id },
      data,
    });
  }

  async upsert(code: string, name: string, status: boolean) {
    return this.prisma.businessType.upsert({
      where: { code },
      update: { name, status },
      create: { code, name, status },
    });
  }

  async hasEnterprises(id: number): Promise<boolean> {
    const count = await this.prisma.enterprise.count({
      where: { businessTypeId: id },
    });
    return count > 0;
  }

  async delete(id: number) {
    return this.prisma.businessType.delete({
      where: { id },
    });
  }
}
