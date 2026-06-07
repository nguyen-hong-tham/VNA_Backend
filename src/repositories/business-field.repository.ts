import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class BusinessFieldRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    code?: string;
    name?: string;
    level?: number;
    status?: boolean;
  }) {
    const where: Prisma.BusinessFieldWhereInput = {};

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

    if (filters.level !== undefined) {
      where.level = filters.level;
    }

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    return this.prisma.businessField.findMany({
      where,
      include: {
        parent: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.businessField.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
  }

  async findByCode(code: string) {
    return this.prisma.businessField.findUnique({
      where: { code },
      include: { parent: true },
    });
  }

  async create(data: Prisma.BusinessFieldCreateInput) {
    return this.prisma.businessField.create({
      data,
      include: { parent: true },
    });
  }

  async update(id: number, data: Prisma.BusinessFieldUpdateInput) {
    return this.prisma.businessField.update({
      where: { id },
      data,
      include: { parent: true },
    });
  }

  async upsert(
    code: string,
    name: string,
    level: number,
    parentId: number | null,
    status: boolean,
  ) {
    return this.prisma.businessField.upsert({
      where: { code },
      update: { name, level, parentId, status },
      create: { code, name, level, parentId, status },
    });
  }
}
