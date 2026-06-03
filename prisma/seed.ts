import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // ==================================================
  // ROLES (2 records - logic requires ADMIN + ENTERPRISE)
  // ==================================================
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: { code: 'ADMIN', name: 'Quản trị viên' },
  });

  const enterpriseRole = await prisma.role.upsert({
    where: { code: 'ENTERPRISE' },
    update: {},
    create: { code: 'ENTERPRISE', name: 'Doanh nghiệp' },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: {},
    create: { code: 'MANAGER', name: 'Quản lý' },
  });

  const inspectorRole = await prisma.role.upsert({
    where: { code: 'INSPECTOR' },
    update: {},
    create: { code: 'INSPECTOR', name: 'Thanh tra viên' },
  });

  const analystRole = await prisma.role.upsert({
    where: { code: 'ANALYST' },
    update: {},
    create: { code: 'ANALYST', name: 'Chuyên viên phân tích' },
  });

  const auditorRole = await prisma.role.upsert({
    where: { code: 'AUDITOR' },
    update: {},
    create: { code: 'AUDITOR', name: 'Kiểm toán viên' },
  });

  const reporterRole = await prisma.role.upsert({
    where: { code: 'REPORTER' },
    update: {},
    create: { code: 'REPORTER', name: 'Người báo cáo' },
  });

  const viewerRole = await prisma.role.upsert({
    where: { code: 'VIEWER' },
    update: {},
    create: { code: 'VIEWER', name: 'Người xem' },
  });

  const coordinatorRole = await prisma.role.upsert({
    where: { code: 'COORDINATOR' },
    update: {},
    create: { code: 'COORDINATOR', name: 'Điều phối viên' },
  });

  const supervisorRole = await prisma.role.upsert({
    where: { code: 'SUPERVISOR' },
    update: {},
    create: { code: 'SUPERVISOR', name: 'Giám sát viên' },
  });

  const allRoles = [
    adminRole, enterpriseRole, managerRole, inspectorRole, analystRole,
    auditorRole, reporterRole, viewerRole, coordinatorRole, supervisorRole,
  ];

  // ==================================================
  // PERMISSIONS (10 records)
  // ==================================================
  const permissionData = [
    { code: 'USER_MANAGE', name: 'Quản lý người dùng' },
    { code: 'ENTERPRISE_APPROVE', name: 'Duyệt doanh nghiệp' },
    { code: 'REPORT_MANAGE', name: 'Quản lý báo cáo' },
    { code: 'REPORT_VIEW', name: 'Xem báo cáo' },
    { code: 'REPORT_EXPORT', name: 'Xuất báo cáo' },
    { code: 'CATEGORY_MANAGE', name: 'Quản lý danh mục' },
    { code: 'ROLE_MANAGE', name: 'Quản lý vai trò' },
    { code: 'PERIOD_MANAGE', name: 'Quản lý kỳ báo cáo' },
    { code: 'ENTERPRISE_VIEW', name: 'Xem thông tin doanh nghiệp' },
    { code: 'DASHBOARD_VIEW', name: 'Xem bảng điều khiển' },
  ];

  const permissions = await Promise.all(
    permissionData.map((p) =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: p,
      })
    )
  );

  // ==================================================
  // ROLE PERMISSIONS (admin gets all 10)
  // ==================================================
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  // manager gets view + export permissions
  for (const perm of permissions.filter((p) =>
    ['REPORT_VIEW', 'REPORT_EXPORT', 'ENTERPRISE_VIEW', 'DASHBOARD_VIEW'].includes(p.code)
  )) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  // ==================================================
  // BUSINESS TYPES (10 records)
  // ==================================================
  const businessTypeData = [
    { code: 'COMPANY', name: 'Công ty TNHH' },
    { code: 'COOPERATIVE', name: 'Hợp tác xã' },
    { code: 'JOINT_STOCK', name: 'Công ty cổ phần' },
    { code: 'STATE_OWNED', name: 'Doanh nghiệp nhà nước' },
    { code: 'PRIVATE', name: 'Doanh nghiệp tư nhân' },
    { code: 'PARTNERSHIP', name: 'Công ty hợp danh' },
    { code: 'FOREIGN', name: 'Doanh nghiệp có vốn nước ngoài' },
    { code: 'HOUSEHOLD', name: 'Hộ kinh doanh' },
    { code: 'ASSOCIATION', name: 'Liên hiệp hợp tác xã' },
    { code: 'ONE_MEMBER', name: 'Công ty TNHH một thành viên' },
  ];

  const businessTypes = await Promise.all(
    businessTypeData.map((bt) =>
      prisma.businessType.upsert({
        where: { code: bt.code },
        update: {},
        create: bt,
      })
    )
  );

  // ==================================================
  // BUSINESS FIELDS (10 records — 5 level-1, 5 level-2)
  // ==================================================
  const manufacturing = await prisma.businessField.upsert({
    where: { code: 'MANUFACTURING' },
    update: {},
    create: { code: 'MANUFACTURING', name: 'Sản xuất', level: 1 },
  });
  const construction = await prisma.businessField.upsert({
    where: { code: 'CONSTRUCTION' },
    update: {},
    create: { code: 'CONSTRUCTION', name: 'Xây dựng', level: 1 },
  });
  const mining = await prisma.businessField.upsert({
    where: { code: 'MINING' },
    update: {},
    create: { code: 'MINING', name: 'Khai khoáng', level: 1 },
  });
  const agriculture = await prisma.businessField.upsert({
    where: { code: 'AGRICULTURE' },
    update: {},
    create: { code: 'AGRICULTURE', name: 'Nông lâm ngư nghiệp', level: 1 },
  });
  const transportation = await prisma.businessField.upsert({
    where: { code: 'TRANSPORTATION' },
    update: {},
    create: { code: 'TRANSPORTATION', name: 'Vận tải', level: 1 },
  });

  // Level-2 fields
  const textileManuf = await prisma.businessField.upsert({
    where: { code: 'TEXTILE' },
    update: {},
    create: { code: 'TEXTILE', name: 'Dệt may', level: 2, parentId: manufacturing.id },
  });
  const foodManuf = await prisma.businessField.upsert({
    where: { code: 'FOOD_PROCESSING' },
    update: {},
    create: { code: 'FOOD_PROCESSING', name: 'Chế biến thực phẩm', level: 2, parentId: manufacturing.id },
  });
  const civilConstr = await prisma.businessField.upsert({
    where: { code: 'CIVIL_CONSTRUCTION' },
    update: {},
    create: { code: 'CIVIL_CONSTRUCTION', name: 'Xây dựng dân dụng', level: 2, parentId: construction.id },
  });
  const coalMining = await prisma.businessField.upsert({
    where: { code: 'COAL_MINING' },
    update: {},
    create: { code: 'COAL_MINING', name: 'Khai thác than', level: 2, parentId: mining.id },
  });
  const roadTransport = await prisma.businessField.upsert({
    where: { code: 'ROAD_TRANSPORT' },
    update: {},
    create: { code: 'ROAD_TRANSPORT', name: 'Vận tải đường bộ', level: 2, parentId: transportation.id },
  });

  const level1Fields = [manufacturing, construction, mining, agriculture, transportation];

  // ==================================================
  // CATEGORIES (10 records each type × 4 types = 40 total)
  // Seeding OCCUPATION, INJURY_FACTOR, ACCIDENT_CAUSE, INJURY_TYPE
  // ==================================================
  const categoryData = [
    // OCCUPATION
    { type: 'OCCUPATION' as const, code: 'WORKER', name: 'Công nhân' },
    { type: 'OCCUPATION' as const, code: 'ENGINEER', name: 'Kỹ sư' },
    { type: 'OCCUPATION' as const, code: 'TECHNICIAN', name: 'Kỹ thuật viên' },
    { type: 'OCCUPATION' as const, code: 'SUPERVISOR_OCC', name: 'Giám sát' },
    { type: 'OCCUPATION' as const, code: 'DRIVER', name: 'Lái xe' },
    { type: 'OCCUPATION' as const, code: 'ELECTRICIAN', name: 'Thợ điện' },
    { type: 'OCCUPATION' as const, code: 'WELDER', name: 'Thợ hàn' },
    { type: 'OCCUPATION' as const, code: 'CARPENTER', name: 'Thợ mộc' },
    { type: 'OCCUPATION' as const, code: 'MASON', name: 'Thợ xây' },
    { type: 'OCCUPATION' as const, code: 'CRANE_OPERATOR', name: 'Thợ vận hành cẩu' },

    // INJURY_FACTOR
    { type: 'INJURY_FACTOR' as const, code: 'MACHINE', name: 'Máy móc, thiết bị' },
    { type: 'INJURY_FACTOR' as const, code: 'FALL_HEIGHT', name: 'Ngã từ trên cao' },
    { type: 'INJURY_FACTOR' as const, code: 'ELECTRIC_SHOCK', name: 'Điện giật' },
    { type: 'INJURY_FACTOR' as const, code: 'CHEMICAL', name: 'Hóa chất' },
    { type: 'INJURY_FACTOR' as const, code: 'FIRE_EXPLOSION', name: 'Cháy nổ' },
    { type: 'INJURY_FACTOR' as const, code: 'HEAVY_OBJECT', name: 'Vật nặng đè' },
    { type: 'INJURY_FACTOR' as const, code: 'VEHICLE', name: 'Phương tiện giao thông' },
    { type: 'INJURY_FACTOR' as const, code: 'COLLAPSE', name: 'Sập đổ công trình' },
    { type: 'INJURY_FACTOR' as const, code: 'HOT_SURFACE', name: 'Bề mặt nóng / bỏng' },
    { type: 'INJURY_FACTOR' as const, code: 'SHARP_OBJECT', name: 'Vật sắc nhọn' },

    // ACCIDENT_CAUSE
    { type: 'ACCIDENT_CAUSE' as const, code: 'UNSAFE_BEHAVIOR', name: 'Hành vi không an toàn' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'NO_PPE', name: 'Không sử dụng BHLĐ' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'UNSAFE_CONDITION', name: 'Điều kiện không an toàn' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'POOR_TRAINING', name: 'Thiếu đào tạo an toàn' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'FATIGUE', name: 'Mệt mỏi, mất tập trung' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'EQUIPMENT_FAILURE', name: 'Hư hỏng thiết bị' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'BAD_WEATHER', name: 'Thời tiết xấu' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'OVERLOAD', name: 'Quá tải công việc' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'PROCEDURE_VIOLATION', name: 'Vi phạm quy trình' },
    { type: 'ACCIDENT_CAUSE' as const, code: 'POOR_SUPERVISION', name: 'Giám sát không đầy đủ' },

    // INJURY_TYPE
    { type: 'INJURY_TYPE' as const, code: 'DEATH', name: 'Tử vong' },
    { type: 'INJURY_TYPE' as const, code: 'SEVERE', name: 'Thương tích nặng' },
    { type: 'INJURY_TYPE' as const, code: 'MODERATE', name: 'Thương tích trung bình' },
    { type: 'INJURY_TYPE' as const, code: 'MINOR', name: 'Thương tích nhẹ' },
    { type: 'INJURY_TYPE' as const, code: 'FRACTURE', name: 'Gãy xương' },
    { type: 'INJURY_TYPE' as const, code: 'BURN', name: 'Bỏng' },
    { type: 'INJURY_TYPE' as const, code: 'AMPUTATION', name: 'Cụt chi' },
    { type: 'INJURY_TYPE' as const, code: 'POISONING', name: 'Ngộ độc' },
    { type: 'INJURY_TYPE' as const, code: 'CONCUSSION', name: 'Chấn thương đầu' },
    { type: 'INJURY_TYPE' as const, code: 'SPRAIN', name: 'Bong gân / trật khớp' },
  ];

  const categories = await Promise.all(
    categoryData.map((c) =>
      prisma.category
        .upsert({
          where: { uq_category: { type: c.type, code: c.code } },
          update: {},
          create: c,
        })
        .catch(() => null)
    )
  );

  const findCategory = (type: string, code: string) =>
    categories.find((c) => c?.type === type && c?.code === code) ?? null;

  // ==================================================
  // USERS (10 records: 1 admin + 9 enterprise users)
  // ==================================================
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      email: 'admin@example.com',
      fullName: 'System Administrator',
      roleId: adminRole.id,
    },
  });

  const enterpriseUsersData = [
    { username: 'enterprise01', email: 'ent01@example.com', fullName: 'Nguyễn Văn A' },
    { username: 'enterprise02', email: 'ent02@example.com', fullName: 'Trần Thị B' },
    { username: 'enterprise03', email: 'ent03@example.com', fullName: 'Lê Văn C' },
    { username: 'enterprise04', email: 'ent04@example.com', fullName: 'Phạm Thị D' },
    { username: 'enterprise05', email: 'ent05@example.com', fullName: 'Hoàng Văn E' },
    { username: 'enterprise06', email: 'ent06@example.com', fullName: 'Vũ Thị F' },
    { username: 'enterprise07', email: 'ent07@example.com', fullName: 'Đặng Văn G' },
    { username: 'enterprise08', email: 'ent08@example.com', fullName: 'Bùi Thị H' },
    { username: 'enterprise09', email: 'ent09@example.com', fullName: 'Ngô Văn I' },
  ];

  const enterpriseUsers = await Promise.all(
    enterpriseUsersData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: { ...u, passwordHash, roleId: enterpriseRole.id },
      })
    )
  );

  // ==================================================
  // ENTERPRISES (10 records)
  // ==================================================
  const enterprisesData = [
    {
      userId: enterpriseUsers[0].id,
      taxCode: '0312345671',
      licenseNumber: 'GPD1000001',
      name: 'Công ty TNHH ABC',
      businessTypeId: businessTypes[0].id,
      businessFieldId: manufacturing.id,
      registeredAddress: 'Quận 1, TP.HCM',
      representativeName: 'Nguyễn Văn A',
      officePhone: '0901111001',
      email: 'contact@abc.com',
      status: 'APPROVED' as const,
    },
    {
      userId: enterpriseUsers[1].id,
      taxCode: '0312345672',
      licenseNumber: 'GPD1000002',
      name: 'Công ty Cổ phần XYZ',
      businessTypeId: businessTypes[2].id,
      businessFieldId: construction.id,
      registeredAddress: 'Quận 3, TP.HCM',
      representativeName: 'Trần Thị B',
      officePhone: '0901111002',
      email: 'contact@xyz.com',
      status: 'APPROVED' as const,
    },
    {
      userId: enterpriseUsers[2].id,
      taxCode: '0312345673',
      licenseNumber: 'GPD1000003',
      name: 'Hợp tác xã Nông nghiệp Xanh',
      businessTypeId: businessTypes[1].id,
      businessFieldId: agriculture.id,
      registeredAddress: 'Huyện Củ Chi, TP.HCM',
      representativeName: 'Lê Văn C',
      officePhone: '0901111003',
      email: 'contact@htxnn.com',
      status: 'APPROVED' as const,
    },
    {
      userId: enterpriseUsers[3].id,
      taxCode: '0312345674',
      licenseNumber: 'GPD1000004',
      name: 'Công ty TNHH MTV Khai Thác Mỏ',
      businessTypeId: businessTypes[9].id,
      businessFieldId: mining.id,
      registeredAddress: 'Quảng Ninh',
      representativeName: 'Phạm Thị D',
      officePhone: '0901111004',
      email: 'contact@khaithacmo.com',
      status: 'PENDING' as const,
    },
    {
      userId: enterpriseUsers[4].id,
      taxCode: '0312345675',
      licenseNumber: 'GPD1000005',
      name: 'Công ty Vận tải Đông Nam',
      businessTypeId: businessTypes[0].id,
      businessFieldId: transportation.id,
      registeredAddress: 'Bình Dương',
      representativeName: 'Hoàng Văn E',
      officePhone: '0901111005',
      email: 'contact@dongnamt.com',
      status: 'APPROVED' as const,
    },
    {
      userId: enterpriseUsers[5].id,
      taxCode: '0312345676',
      licenseNumber: 'GPD1000006',
      name: 'Công ty Dệt May Phương Nam',
      businessTypeId: businessTypes[2].id,
      businessFieldId: textileManuf.id,
      registeredAddress: 'Long An',
      representativeName: 'Vũ Thị F',
      officePhone: '0901111006',
      email: 'contact@detmaypn.com',
      status: 'APPROVED' as const,
    },
    {
      userId: enterpriseUsers[6].id,
      taxCode: '0312345677',
      licenseNumber: 'GPD1000007',
      name: 'Công ty Chế Biến Thực Phẩm Sao Mai',
      businessTypeId: businessTypes[0].id,
      businessFieldId: foodManuf.id,
      registeredAddress: 'Tiền Giang',
      representativeName: 'Đặng Văn G',
      officePhone: '0901111007',
      email: 'contact@saomaitp.com',
      status: 'REJECTED' as const,
      rejectReason: 'Hồ sơ chưa đầy đủ',
    },
    {
      userId: enterpriseUsers[7].id,
      taxCode: '0312345678',
      licenseNumber: 'GPD1000008',
      name: 'Công ty Xây Dựng Tiến Phát',
      businessTypeId: businessTypes[2].id,
      businessFieldId: civilConstr.id,
      registeredAddress: 'Đồng Nai',
      representativeName: 'Bùi Thị H',
      officePhone: '0901111008',
      email: 'contact@tienphatxd.com',
      status: 'APPROVED' as const,
    },
    {
      userId: enterpriseUsers[8].id,
      taxCode: '0312345679',
      licenseNumber: 'GPD1000009',
      name: 'Công ty Khai Thác Than Hồng Hà',
      businessTypeId: businessTypes[3].id,
      businessFieldId: coalMining.id,
      registeredAddress: 'Quảng Ngãi',
      representativeName: 'Ngô Văn I',
      officePhone: '0901111009',
      email: 'contact@honghakhoang.com',
      status: 'APPROVED' as const,
    },
  ];

  const enterprises = await Promise.all(
    enterprisesData.map((e) =>
      prisma.enterprise.upsert({
        where: { userId: e.userId },
        update: {},
        create: {
          ...e,
          approvedAt: e.status === 'APPROVED' ? new Date() : undefined,
          approvedBy: e.status === 'APPROVED' ? admin.id : undefined,
        },
      })
    )
  );

  // ==================================================
  // ENTERPRISE DOCUMENTS (10 records)
  // ==================================================
  await prisma.enterpriseDocument.createMany({
    data: enterprises.slice(0, 10).map((ent, i) => ({
      enterpriseId: ent.id,
      documentName: 'Giấy phép kinh doanh',
      documentType: 'BUSINESS_LICENSE' as const,
      fileName: `license_${i + 1}.pdf`,
      filePath: `/uploads/license_${i + 1}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 204800 + i * 10240,
    })),
    skipDuplicates: true,
  });

  // ==================================================
  // REPORT PERIODS (10 records: 5 years × 2 period types)
  // ==================================================
  const periodData = [
    { year: 2020, periodType: 'YEAR' as const, reportName: 'Báo cáo năm 2020', status: 'CLOSED' as const },
    { year: 2021, periodType: 'HALF_YEAR' as const, reportName: 'Báo cáo 6 tháng 2021', status: 'CLOSED' as const },
    { year: 2021, periodType: 'YEAR' as const, reportName: 'Báo cáo năm 2021', status: 'CLOSED' as const },
    { year: 2022, periodType: 'HALF_YEAR' as const, reportName: 'Báo cáo 6 tháng 2022', status: 'CLOSED' as const },
    { year: 2022, periodType: 'YEAR' as const, reportName: 'Báo cáo năm 2022', status: 'CLOSED' as const },
    { year: 2023, periodType: 'HALF_YEAR' as const, reportName: 'Báo cáo 6 tháng 2023', status: 'CLOSED' as const },
    { year: 2023, periodType: 'YEAR' as const, reportName: 'Báo cáo năm 2023', status: 'CLOSED' as const },
    { year: 2024, periodType: 'HALF_YEAR' as const, reportName: 'Báo cáo 6 tháng 2024', status: 'CLOSED' as const },
    { year: 2024, periodType: 'YEAR' as const, reportName: 'Báo cáo năm 2024', status: 'CLOSED' as const },
    { year: 2025, periodType: 'YEAR' as const, reportName: 'Báo cáo năm 2025', status: 'OPEN' as const },
  ];

  const reportPeriods = await Promise.all(
    periodData.map((p) =>
      prisma.reportPeriod.upsert({
        where: { uq_report_period: { year: p.year, periodType: p.periodType } },
        update: {},
        create: p,
      })
    )
  );

  // ==================================================
  // REPORTS (10 records — 1 per approved enterprise × recent period)
  // ==================================================
  const approvedEnterprises = enterprises.filter((_, i) =>
    enterprisesData[i]?.status === 'APPROVED'
  );

  const latestPeriod = reportPeriods[reportPeriods.length - 1]; // 2025 YEAR

  const reportsData = approvedEnterprises.slice(0, 10).map((ent, i) => ({
    enterpriseId: ent.id,
    reportPeriodId: latestPeriod.id,
    createdBy: enterpriseUsers[i]?.id ?? enterpriseUsers[0].id,
    status: (i % 3 === 0 ? 'DRAFT' : i % 3 === 1 ? 'SUBMITTED' : 'APPROVED') as const,
    companyEmployeeTotal: 50 + i * 30,
    femaleEmployeeTotal: 20 + i * 10,
    salaryFund: 200000000 + i * 50000000,
    submittedAt: i % 3 !== 0 ? new Date() : undefined,
  }));

  // Use createMany with skipDuplicates; fall back to upsert per record to handle unique constraint
  const reports: { id: number; enterpriseId: number }[] = [];
  for (const r of reportsData) {
    try {
      const created = await prisma.report.create({ data: r });
      reports.push(created);
    } catch {
      // Report already exists for this enterprise+period — skip
      const existing = await prisma.report.findFirst({
        where: { enterpriseId: r.enterpriseId, reportPeriodId: r.reportPeriodId },
      });
      if (existing) reports.push(existing);
    }
  }

  // ==================================================
  // REPORT SECTIONS (10 records: 1 ACCIDENT section per report)
  // ==================================================
  const sections: { id: number }[] = [];
  for (const report of reports.slice(0, 10)) {
    try {
      const section = await prisma.reportSection.create({
        data: {
          reportId: report.id,
          sectionType: 'ACCIDENT',
          accidentCount: Math.floor(Math.random() * 10) + 1,
          fatalAccidentCount: Math.floor(Math.random() * 3),
          victimCount: Math.floor(Math.random() * 15) + 1,
          deathCount: Math.floor(Math.random() * 3),
          severelyInjuredCount: Math.floor(Math.random() * 5),
          femaleVictimCount: Math.floor(Math.random() * 5),
          medicalCost: (Math.floor(Math.random() * 50) + 5) * 1_000_000,
          compensationCost: (Math.floor(Math.random() * 100) + 10) * 1_000_000,
          salaryCompensation: (Math.floor(Math.random() * 30) + 5) * 1_000_000,
          daysLost: Math.floor(Math.random() * 100) + 10,
        },
      });
      sections.push(section);
    } catch {
      const existing = await prisma.reportSection.findFirst({
        where: { reportId: report.id, sectionType: 'ACCIDENT' },
      });
      if (existing) sections.push(existing);
    }
  }

  // ==================================================
  // REPORT ACCIDENT CASES (10 records)
  // ==================================================
  const accidentCauses = categoryData
    .filter((c) => c.type === 'ACCIDENT_CAUSE')
    .map((c) => findCategory('ACCIDENT_CAUSE', c.code));

  const injuryFactors = categoryData
    .filter((c) => c.type === 'INJURY_FACTOR')
    .map((c) => findCategory('INJURY_FACTOR', c.code));

  const occupations = categoryData
    .filter((c) => c.type === 'OCCUPATION')
    .map((c) => findCategory('OCCUPATION', c.code));

  for (let i = 0; i < Math.min(10, sections.length); i++) {
    await prisma.reportAccidentCase.create({
      data: {
        reportSectionId: sections[i % sections.length].id,
        accidentCauseId: accidentCauses[i % accidentCauses.length]?.id,
        injuryFactorId: injuryFactors[i % injuryFactors.length]?.id,
        occupationId: occupations[i % occupations.length]?.id,
        accidentCount: Math.floor(Math.random() * 5) + 1,
        fatalAccidentCount: Math.floor(Math.random() * 2),
        victimCount: Math.floor(Math.random() * 8) + 1,
        deathCount: Math.floor(Math.random() * 2),
        severelyInjuredCount: Math.floor(Math.random() * 3),
        femaleVictimCount: Math.floor(Math.random() * 3),
        medicalCost: (Math.floor(Math.random() * 20) + 2) * 1_000_000,
        compensationCost: (Math.floor(Math.random() * 50) + 5) * 1_000_000,
        salaryCompensation: (Math.floor(Math.random() * 15) + 2) * 1_000_000,
        daysLost: Math.floor(Math.random() * 30) + 5,
      },
    });
  }

  console.log('✅ Seed completed');
  console.log(`   Roles: ${allRoles.length}`);
  console.log(`   Permissions: ${permissions.length}`);
  console.log(`   BusinessTypes: ${businessTypes.length}`);
  console.log(`   BusinessFields: 10`);
  console.log(`   Categories: ${categoryData.length} (across 4 types)`);
  console.log(`   Users: ${enterpriseUsers.length + 1}`);
  console.log(`   Enterprises: ${enterprises.length}`);
  console.log(`   EnterpriseDocuments: ${enterprises.length}`);
  console.log(`   ReportPeriods: ${reportPeriods.length}`);
  console.log(`   Reports: ${reports.length}`);
  console.log(`   ReportSections: ${sections.length}`);
  console.log(`   ReportAccidentCases: ${Math.min(10, sections.length)}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
