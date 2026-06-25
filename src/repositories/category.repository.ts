import { Injectable } from '@nestjs/common';
import { CategoryType, Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class CategoryRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    type?: CategoryType;
    code?: string;
    name?: string;
    status?: boolean;
    parentId?: number | null;
  }) {
    const where: Prisma.CategoryWhereInput = {};

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.code) {
      where.code = { contains: filters.code, mode: 'insensitive' };
    }
    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters.status !== undefined) {
      where.status = filters.status;
    }
    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    return this.prisma.category.findMany({
      where,
      include: { parent: { select: { id: true, code: true, name: true } } },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  async findById(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true, status: true },
        },
      },
    });
  }

  async findByTypeAndCode(type: CategoryType, code: string) {
    return this.prisma.category.findUnique({
      where: { uq_category: { type, code } },
    });
  }

  async create(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({
      data,
      include: { parent: { select: { id: true, code: true, name: true } } },
    });
  }

  async update(id: number, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({
      where: { id },
      data,
      include: { parent: { select: { id: true, code: true, name: true } } },
    });
  }

  async upsert(
    type: CategoryType,
    code: string,
    name: string,
    status: boolean,
    parentId?: number,
    level?: number,
  ) {
    return this.prisma.category.upsert({
      where: { uq_category: { type, code } },
      update: {
        name,
        status,
        ...(parentId !== undefined ? { parentId } : {}),
        ...(level !== undefined ? { level } : {}),
      },
      create: {
        type,
        code,
        name,
        status,
        parentId: parentId ?? null,
        level: level ?? 1,
      },
    });
  }

  async hasAccidentCases(id: number): Promise<boolean> {
    const count = await this.prisma.reportAccidentCase.count({
      where: {
        OR: [
          { accidentCauseId: id },
          { injuryFactorId: id },
          { occupationId: id },
        ],
      },
    });
    return count > 0;
  }

  async delete(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }

  async countChildren(parentId: number): Promise<number> {
    return this.prisma.category.count({ where: { parentId } });
  }
}
