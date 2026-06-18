import { Injectable } from '@nestjs/common';
import { Prisma, EnterpriseStatus, DocumentType } from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class EnterpriseRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters: {
      search?: string;
      businessTypeId?: number;
      businessFieldId?: number;
      wardId?: number;
      status?: EnterpriseStatus;
    },
    pagination: { page: number; limit: number },
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.EnterpriseWhereInput = {};

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          taxCode: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filters.businessTypeId !== undefined) {
      where.businessTypeId = filters.businessTypeId;
    }

    if (filters.businessFieldId !== undefined) {
      where.businessFieldId = filters.businessFieldId;
    }

    if (filters.wardId !== undefined) {
      where.wardId = filters.wardId;
    }

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.enterprise.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              isActive: true,
            },
          },
          businessType: true,
          businessField: true,
          documents: true,
          approver: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.enterprise.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number) {
    return this.prisma.enterprise.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            isActive: true,
          },
        },
        businessType: true,
        businessField: true,
        documents: true,
        approver: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findByTaxCode(taxCode: string) {
    return this.prisma.enterprise.findUnique({
      where: { taxCode },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findByLicenseNumber(licenseNumber: string) {
    return this.prisma.enterprise.findUnique({
      where: { licenseNumber },
    });
  }

  async create(data: {
    enterprise: {
      taxCode: string;
      licenseNumber: string;
      licenseIssueDate?: Date | null;
      name: string;
      englishName?: string | null;
      businessTypeId: number;
      businessFieldId: number;
      provinceId?: number | null;
      wardId?: number | null;
      registeredAddress?: string | null;
      operatingProvinceId?: number | null;
      operatingWardId?: number | null;
      operatingAddress?: string | null;
      email?: string | null;
      officePhone?: string | null;
      representativeName?: string | null;
      representativePhone?: string | null;
      status?: EnterpriseStatus;
    };
    user: {
      username: string;
      passwordHash: string;
      fullName?: string | null;
      email?: string | null;
      roleId: number;
      isActive?: boolean;
      provinceId?: number | null;
      wardId?: number | null;
      address?: string | null;
    };
    documents?: {
      documentName: string;
      documentType: DocumentType;
      fileName: string;
      filePath: string;
      mimeType?: string | null;
      fileSize?: number | null;
    }[];
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          username: data.user.username,
          passwordHash: data.user.passwordHash,
          fullName: data.user.fullName,
          email: data.user.email,
          isActive: data.user.isActive ?? true,
          provinceId: data.user.provinceId,
          wardId: data.user.wardId,
          address: data.user.address,
          role: { connect: { id: data.user.roleId } },
        },
      });

      // 2. Create Enterprise
      const enterprise = await tx.enterprise.create({
        data: {
          taxCode: data.enterprise.taxCode,
          licenseNumber: data.enterprise.licenseNumber,
          licenseIssueDate: data.enterprise.licenseIssueDate,
          name: data.enterprise.name,
          englishName: data.enterprise.englishName,
          provinceId: data.enterprise.provinceId,
          wardId: data.enterprise.wardId,
          registeredAddress: (data.enterprise.registeredAddress ?? null) as any,
          operatingProvinceId: data.enterprise.operatingProvinceId,
          operatingWardId: data.enterprise.operatingWardId,
          operatingAddress: data.enterprise.operatingAddress,
          email: data.enterprise.email,
          officePhone: data.enterprise.officePhone,
          representativeName: (data.enterprise.representativeName ??
            null) as any,
          representativePhone: data.enterprise.representativePhone,
          status: data.enterprise.status ?? EnterpriseStatus.PENDING,
          user: { connect: { id: user.id } },
          businessType: { connect: { id: data.enterprise.businessTypeId } },
          businessField: { connect: { id: data.enterprise.businessFieldId } },
        },
      });

      // 3. Create Documents (if any)
      if (data.documents && data.documents.length > 0) {
        await tx.enterpriseDocument.createMany({
          data: data.documents.map((doc) => ({
            ...doc,
            enterpriseId: enterprise.id,
          })),
        });
      }

      // Return complete created enterprise
      return tx.enterprise.findUnique({
        where: { id: enterprise.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              isActive: true,
              provinceId: true,
              wardId: true,
              address: true,
            },
          },
          businessType: true,
          businessField: true,
          documents: true,
        },
      });
    });
  }

  async update(
    id: number,
    data: {
      enterprise: {
        name?: string;
        licenseNumber?: string;
        licenseIssueDate?: Date | null;
        businessTypeId?: number;
        businessFieldId?: number;
        provinceId?: number | null;
        wardId?: number | null;
        registeredAddress?: string | null;
        operatingProvinceId?: number | null;
        operatingWardId?: number | null;
        operatingAddress?: string | null;
        englishName?: string | null;
        email?: string;
        officePhone?: string | null;
        representativeName?: string | null;
        representativePhone?: string | null;
      };
      documents?: {
        documentName: string;
        documentType: DocumentType;
        fileName: string;
        filePath: string;
        mimeType?: string | null;
        fileSize?: number | null;
      }[];
      user?: {
        fullName?: string;
        email?: string;
        provinceId?: number | null;
        wardId?: number | null;
        address?: string | null;
      };
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Build updated data for enterprise
      const enterpriseData: any = {
        name: data.enterprise.name,
        licenseNumber: data.enterprise.licenseNumber,
        licenseIssueDate: data.enterprise.licenseIssueDate,
        provinceId: data.enterprise.provinceId,
        wardId: data.enterprise.wardId,
        registeredAddress: data.enterprise.registeredAddress,
        operatingProvinceId: data.enterprise.operatingProvinceId,
        operatingWardId: data.enterprise.operatingWardId,
        operatingAddress: data.enterprise.operatingAddress,
        englishName: data.enterprise.englishName,
        email: data.enterprise.email,
        officePhone: data.enterprise.officePhone,
        representativeName: data.enterprise.representativeName,
        representativePhone: data.enterprise.representativePhone,
      };

      if (data.enterprise.businessTypeId !== undefined) {
        enterpriseData.businessType = {
          connect: { id: data.enterprise.businessTypeId },
        };
      }
      if (data.enterprise.businessFieldId !== undefined) {
        enterpriseData.businessField = {
          connect: { id: data.enterprise.businessFieldId },
        };
      }

      // 1. Update Enterprise
      const enterprise = await tx.enterprise.update({
        where: { id },
        data: enterpriseData,
      });

      // 2. Update linked User if user data is provided
      if (data.user) {
        await tx.user.update({
          where: { id: enterprise.userId },
          data: {
            fullName: data.user.fullName,
            email: data.user.email,
            provinceId: data.user.provinceId,
            wardId: data.user.wardId,
            address: data.user.address,
          },
        });
      }

      // 3. Update Documents (if provided)
      if (data.documents !== undefined) {
        // Delete old documents from database
        await tx.enterpriseDocument.deleteMany({
          where: { enterpriseId: id },
        });

        // Insert new ones
        if (data.documents.length > 0) {
          await tx.enterpriseDocument.createMany({
            data: data.documents.map((doc) => ({
              ...doc,
              enterpriseId: id,
            })),
          });
        }
      }

      // Return updated enterprise
      return tx.enterprise.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              isActive: true,
            },
          },
          businessType: true,
          businessField: true,
          documents: true,
        },
      });
    });
  }

  async updateStatus(
    id: number,
    status: EnterpriseStatus,
    approvedBy?: number,
  ) {
    const data: Prisma.EnterpriseUpdateInput = { status };
    if (status === 'APPROVED') {
      data.approvedAt = new Date();
      if (approvedBy) {
        data.approver = { connect: { id: approvedBy } };
      }
    } else {
      data.approvedAt = null;
      data.approver = { disconnect: true };
    }

    return this.prisma.enterprise.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
            isActive: true,
          },
        },
        businessType: true,
        businessField: true,
        documents: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const enterprise = await tx.enterprise.findUnique({
        where: { id },
      });
      if (!enterprise) return null;

      // Delete reports (cascades to sections and accident cases)
      await tx.report.deleteMany({
        where: { enterpriseId: id },
      });

      // Delete enterprise (cascades to documents)
      await tx.enterprise.delete({
        where: { id },
      });

      // Delete linked user (cascades to password resets and email change otps)
      await tx.user.delete({
        where: { id: enterprise.userId },
      });

      return enterprise;
    });
  }
}
