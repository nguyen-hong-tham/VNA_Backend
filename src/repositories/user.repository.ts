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

    const { fullName, username, email, roleId, isActive, page = 1, limit = 10 } = query
    return this.prisma.user.findMany({
      where: {
        fullName: fullName ? {
          contains: fullName,
          mode: Prisma.QueryMode.insensitive
        } : undefined,
        username: username ? {
          contains: username,
          mode: Prisma.QueryMode.insensitive
        } : undefined,
        email: email ? {
          contains: email,
          mode: Prisma.QueryMode.insensitive
        } : undefined,
        roleId: roleId,
        isActive: isActive
      },
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) - limit,
      take: limit,
    })
  }


}
