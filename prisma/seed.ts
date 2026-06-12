/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // ==================================================
  // ROLES (4 records in order: ADMIN, MANAGER, STAFF, ENTERPRISE)
  // ==================================================
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: { name: 'Quản trị viên' },
    create: { code: 'ADMIN', name: 'Quản trị viên' },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: { name: 'Quản lý' },
    create: { code: 'MANAGER', name: 'Quản lý' },
  });

  const staffRole = await prisma.role.upsert({
    where: { code: 'STAFF' },
    update: { name: 'Nhân viên nghiệp vụ' },
    create: { code: 'STAFF', name: 'Nhân viên nghiệp vụ' },
  });

  const enterpriseRole = await prisma.role.upsert({
    where: { code: 'ENTERPRISE' },
    update: { name: 'Doanh nghiệp' },
    create: { code: 'ENTERPRISE', name: 'Doanh nghiệp' },
  });

  const allRoles = [
    adminRole,
    managerRole,
    staffRole,
    enterpriseRole,
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
      }),
    ),
  );

  // ==================================================
  // ROLE PERMISSIONS
  // ==================================================

  // admin gets all 10 permissions
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  // manager gets approve, view, export, enterprise view, and dashboard view permissions
  for (const perm of permissions.filter((p) =>
    [
      'ENTERPRISE_APPROVE',
      'REPORT_VIEW',
      'REPORT_EXPORT',
      'ENTERPRISE_VIEW',
      'DASHBOARD_VIEW',
    ].includes(p.code),
  )) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  // staff gets view, dashboard view, and enterprise view permissions
  for (const perm of permissions.filter((p) =>
    [
      'REPORT_VIEW',
      'ENTERPRISE_VIEW',
      'DASHBOARD_VIEW',
    ].includes(p.code),
  )) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: staffRole.id, permissionId: perm.id },
    });
  }

  // ==================================================
  // BUSINESS TYPES (6 records matching database screenshot)
  // ==================================================
  const businessTypeData = [
    { code: '150', name: 'Doanh nghiệp tư nhân' },
    { code: '120', name: 'Công ty TNHH 1 Thành viên' },
    { code: '130', name: 'Công ty TNHH 2 Thành viên' },
    { code: '140', name: 'Công ty hợp danh' },
    { code: '110', name: 'Doanh nghiệp nhà nước' },
    { code: '160', name: 'Công ty cổ phần' },
  ];

  const businessTypeCodeToIdMap: Record<string, number> = {};
  const businessTypes = await Promise.all(
    businessTypeData.map(async (bt) => {
      const record = await prisma.businessType.upsert({
        where: { code: bt.code },
        update: { name: bt.name },
        create: bt,
      });
      businessTypeCodeToIdMap[bt.code] = record.id;
      return record;
    }),
  );

  // ==================================================
  // BUSINESS FIELDS (seeding up to Level 4)
  // ==================================================
  const businessFieldsData = [
    // A: NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN
    { code: 'A', name: 'NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN', level: 1, parentCode: null },
    { code: '01', name: 'Nông nghiệp và hoạt động dịch vụ có liên quan', level: 2, parentCode: 'A' },
    { code: '011', name: 'Trồng cây hàng năm', level: 3, parentCode: '01' },
    { code: '0111', name: 'Trồng lúa', level: 4, parentCode: '011' },
    { code: '0112', name: 'Trồng ngô và cây lương thực có hạt khác', level: 4, parentCode: '011' },
    { code: '0113', name: 'Trồng cây lấy củ có chất bột', level: 4, parentCode: '011' },
    { code: '0114', name: 'Trồng cây mía', level: 4, parentCode: '011' },
    { code: '0115', name: 'Trồng cây thuốc lá, thuốc lào', level: 4, parentCode: '011' },
    { code: '0116', name: 'Trồng cây lấy sợi', level: 4, parentCode: '011' },
    { code: '0117', name: 'Trồng cây có hạt chứa dầu', level: 4, parentCode: '011' },
    { code: '0118', name: 'Trồng rau, đậu các loại và trồng hoa', level: 4, parentCode: '011' },
    { code: '0119', name: 'Trồng cây hàng năm khác', level: 4, parentCode: '011' },
    { code: '012', name: 'Trồng cây lâu năm', level: 3, parentCode: '01' },
    { code: '0121', name: 'Trồng cây ăn quả', level: 4, parentCode: '012' },
    { code: '0122', name: 'Trồng cây lấy quả chứa dầu', level: 4, parentCode: '012' },
    { code: '0123', name: 'Trồng cây điều', level: 4, parentCode: '012' },
    { code: '0124', name: 'Trồng cây hồ tiêu', level: 4, parentCode: '012' },
    { code: '0125', name: 'Trồng cây cao su', level: 4, parentCode: '012' },
    { code: '0126', name: 'Trồng cây cà phê', level: 4, parentCode: '012' },
    { code: '0127', name: 'Trồng cây chè', level: 4, parentCode: '012' },
    { code: '0128', name: 'Trồng cây gia vị, cây dược liệu, cây hương liệu lâu năm', level: 4, parentCode: '012' },
    { code: '0129', name: 'Trồng cây lâu năm khác', level: 4, parentCode: '012' },
    { code: '013', name: 'Nhân và chăm sóc cây giống nông nghiệp', level: 3, parentCode: '01' },
    { code: '0130', name: 'Nhân và chăm sóc cây giống nông nghiệp', level: 4, parentCode: '013' },
    { code: '014', name: 'Chăn nuôi', level: 3, parentCode: '01' },
    { code: '0141', name: 'Chăn nuôi trâu, bò và sản xuất giống trâu, bò', level: 4, parentCode: '014' },
    { code: '0142', name: 'Chăn nuôi ngựa, lừa, la và sản xuất giống ngựa, lừa', level: 4, parentCode: '014' },
    { code: '0144', name: 'Chăn nuôi dê, cừu, hươu, nai và sản xuất giống dê, cừu, hươu, nai', level: 4, parentCode: '014' },
    { code: '0145', name: 'Chăn nuôi lợn và sản xuất giống lợn', level: 4, parentCode: '014' },
    { code: '0146', name: 'Chăn nuôi gia cầm', level: 4, parentCode: '014' },
    { code: '0149', name: 'Chăn nuôi khác', level: 4, parentCode: '014' },
    { code: '015', name: 'Trồng trọt, chăn nuôi hỗn hợp', level: 3, parentCode: '01' },
    { code: '0150', name: 'Trồng trọt, chăn nuôi hỗn hợp', level: 4, parentCode: '015' },
    { code: '016', name: 'Hoạt động dịch vụ nông nghiệp', level: 3, parentCode: '01' },
    { code: '0161', name: 'Hoạt động dịch vụ trồng trọt', level: 4, parentCode: '016' },
    { code: '0162', name: 'Hoạt động dịch vụ chăn nuôi', level: 4, parentCode: '016' },
    { code: '0163', name: 'Hoạt động dịch vụ sau thu hoạch', level: 4, parentCode: '016' },
    { code: '0164', name: 'Xử lý hạt giống để nhân giống', level: 4, parentCode: '016' },
    { code: '017', name: 'Săn bắt, đánh bẫy và hoạt động dịch vụ có liên quan', level: 3, parentCode: '01' },
    { code: '0170', name: 'Săn bắt, đánh bẫy và hoạt động dịch vụ có liên quan', level: 4, parentCode: '017' },

    // 02: Lâm nghiệp và hoạt động dịch vụ có liên quan
    { code: '02', name: 'Lâm nghiệp và hoạt động dịch vụ có liên quan', level: 2, parentCode: 'A' },
    { code: '021', name: 'Trồng rừng, chăm sóc rừng và ươm giống cây lâm nghiệp', level: 3, parentCode: '02' },
    { code: '0210', name: 'Trồng rừng, chăm sóc rừng và ươm giống cây lâm nghiệp', level: 4, parentCode: '021' },
    { code: '022', name: 'Khai thác gỗ', level: 3, parentCode: '02' },
    { code: '0220', name: 'Khai thác gỗ', level: 4, parentCode: '022' },
    { code: '023', name: 'Khai thác, thu nhặt lâm sản phi gỗ', level: 3, parentCode: '02' },
    { code: '0230', name: 'Khai thác, thu nhặt lâm sản phi gỗ', level: 4, parentCode: '023' },
    { code: '024', name: 'Hoạt động dịch vụ lâm nghiệp', level: 3, parentCode: '02' },
    { code: '0240', name: 'Hoạt động dịch vụ lâm nghiệp', level: 4, parentCode: '024' },

    // 03: Khai thác, nuôi trồng thủy sản và hoạt động dịch vụ có liên quan
    { code: '03', name: 'Khai thác, nuôi trồng thủy sản và hoạt động dịch vụ có liên quan', level: 2, parentCode: 'A' },
    { code: '031', name: 'Khai thác thủy sản', level: 3, parentCode: '03' },
    { code: '0311', name: 'Khai thác thủy sản biển', level: 4, parentCode: '031' },
    { code: '0312', name: 'Khai thác thủy sản nội địa', level: 4, parentCode: '031' },
    { code: '032', name: 'Nuôi trồng thủy sản', level: 3, parentCode: '03' },
    { code: '0321', name: 'Nuôi trồng thủy sản biển', level: 4, parentCode: '032' },
    { code: '0322', name: 'Nuôi trồng thủy sản nội địa', level: 4, parentCode: '032' },
    { code: '033', name: 'Hoạt động dịch vụ hỗ trợ khai thác, nuôi trồng thủy sản', level: 3, parentCode: '03' },
    { code: '0331', name: 'Hoạt động dịch vụ hỗ trợ khai thác thủy sản', level: 4, parentCode: '033' },
    { code: '0332', name: 'Hoạt động dịch vụ hỗ trợ nuôi trồng thủy sản', level: 4, parentCode: '033' },

    // B: KHAI KHOÁNG
    { code: 'B', name: 'KHAI KHOÁNG', level: 1, parentCode: null },
    { code: '05', name: 'Khai thác than cứng và than non', level: 2, parentCode: 'B' },
    { code: '051', name: 'Khai thác và thu gom than cứng', level: 3, parentCode: '05' },
    { code: '0510', name: 'Khai thác và thu gom than cứng', level: 4, parentCode: '051' },
    { code: '052', name: 'Khai thác và thu gom than non', level: 3, parentCode: '05' },
    { code: '0520', name: 'Khai thác và thu gom than non', level: 4, parentCode: '052' },
    { code: '06', name: 'Khai thác dầu thô và khí đốt tự nhiên', level: 2, parentCode: 'B' },
    { code: '061', name: 'Khai thác dầu thô', level: 3, parentCode: '06' },
    { code: '0610', name: 'Khai thác dầu thô', level: 4, parentCode: '061' },
    { code: '062', name: 'Khai thác khí đốt tự nhiên', level: 3, parentCode: '06' },
    { code: '0620', name: 'Khai thác khí đốt tự nhiên', level: 4, parentCode: '062' },
    { code: '07', name: 'Khai thác quặng kim loại', level: 2, parentCode: 'B' },
    { code: '071', name: 'Khai thác quặng sắt', level: 3, parentCode: '07' },
    { code: '0710', name: 'Khai thác quặng sắt', level: 4, parentCode: '071' },
    { code: '072', name: 'Khai thác quặng không chứa sắt (trừ quặng kim loại quý hiếm)', level: 3, parentCode: '07' },
    { code: '0721', name: 'Khai thác quặng uranium và quặng thorium', level: 4, parentCode: '072' },
    { code: '0729', name: 'Khai thác quặng kim loại khác không chứa sắt', level: 4, parentCode: '072' },
    { code: '073', name: 'Khai thác quặng kim loại quý hiếm', level: 3, parentCode: '07' },
    { code: '0730', name: 'Khai thác quặng kim loại quý hiếm', level: 4, parentCode: '073' },
    { code: '08', name: 'Khai khoáng khác', level: 2, parentCode: 'B' },
    { code: '081', name: 'Khai thác đá, cát, sỏi, đất sét', level: 3, parentCode: '08' },
    { code: '0810', name: 'Khai thác đá, cát, sỏi, đất sét', level: 4, parentCode: '081' },
    { code: '089', name: 'Khai khoáng chưa được phân vào đâu', level: 3, parentCode: '08' },
    { code: '0891', name: 'Khai thác khoáng hóa chất và khoáng phân bón', level: 4, parentCode: '089' },
    { code: '0892', name: 'Khai thác và thu gom than bùn', level: 4, parentCode: '089' },
    { code: '0893', name: 'Khai thác muối', level: 4, parentCode: '089' },
    { code: '0899', name: 'Khai khoáng khác chưa được phân vào đâu', level: 4, parentCode: '089' },
    { code: '09', name: 'Hoạt động dịch vụ hỗ trợ khai khoáng', level: 2, parentCode: 'B' },
    { code: '091', name: 'Hoạt động dịch vụ hỗ trợ khai thác dầu thô và khí tự nhiên', level: 3, parentCode: '09' },
    { code: '0910', name: 'Hoạt động dịch vụ hỗ trợ khai thác dầu thô và khí tự nhiên', level: 4, parentCode: '091' },
    { code: '099', name: 'Hoạt động dịch vụ hỗ trợ khai khoáng khác', level: 3, parentCode: '09' },
    { code: '0990', name: 'Hoạt động dịch vụ hỗ trợ khai khoáng khác', level: 4, parentCode: '099' },

    // C: CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO
    { code: 'C', name: 'CÔNG NGHIỆP CHẾ BIẾN, CHẾ TẠO', level: 1, parentCode: null },
    { code: '10', name: 'Sản xuất, chế biến thực phẩm', level: 2, parentCode: 'C' },
    { code: '101', name: 'Chế biến, bảo quan thịt và các sản phẩm từ thịt', level: 3, parentCode: '10' },
    { code: '1010', name: 'Chế biến, bảo quản thịt và các sản phẩm từ thịt', level: 4, parentCode: '101' },
    { code: '102', name: 'Chế biến, bảo quản thủy sản và các sản phẩm từ thủy sản', level: 3, parentCode: '10' },
    { code: '1020', name: 'Chế biến, bảo quản thủy sản và các sản phẩm từ thủy sản', level: 4, parentCode: '102' },
    { code: '103', name: 'Chế biến và bảo quản rau quả', level: 3, parentCode: '10' },
    { code: '1030', name: 'Chế biến và bảo quản rau quả', level: 4, parentCode: '103' },
    { code: '104', name: 'Sản xuất dầu, mỡ động, thực vật', level: 3, parentCode: '10' },
    { code: '1040', name: 'Sản xuất dầu, mỡ động, thực vật', level: 4, parentCode: '104' },
    { code: '105', name: 'Chế biến sữa và các sản phẩm từ sữa', level: 3, parentCode: '10' },
    { code: '1050', name: 'Chế biến sữa và các sản phẩm từ sữa', level: 4, parentCode: '105' },
    { code: '106', name: 'Xay xát và sản xuất bột', level: 3, parentCode: '10' },
    { code: '1061', name: 'Xay xát và sản xuất bột thô', level: 4, parentCode: '106' },
    { code: '1062', name: 'Sản xuất tinh bột và các sản phẩm từ tinh bột', level: 4, parentCode: '106' },
    { code: '107', name: 'Sản xuất thực phẩm khác', level: 3, parentCode: '10' },
    { code: '1071', name: 'Sản xuất các loại bánh từ bột', level: 4, parentCode: '107' }
  ];

  const codeToIdMap: Record<string, number> = {};
  for (const f of businessFieldsData) {
    const parentId = f.parentCode ? codeToIdMap[f.parentCode] : null;
    const record = await prisma.businessField.upsert({
      where: { code: f.code },
      update: {
        name: f.name,
        level: f.level,
        parentId: parentId || undefined,
      },
      create: {
        code: f.code,
        name: f.name,
        level: f.level,
        parentId: parentId || undefined,
      },
    });
    codeToIdMap[f.code] = record.id;
  }

  const level1Fields = [
    codeToIdMap['A'],
    codeToIdMap['B'],
    codeToIdMap['C'],
  ].filter(Boolean);

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
    {
      type: 'OCCUPATION' as const,
      code: 'CRANE_OPERATOR',
      name: 'Thợ vận hành cẩu',
    },

    // INJURY_FACTOR
    {
      type: 'INJURY_FACTOR' as const,
      code: 'MACHINE',
      name: 'Máy móc, thiết bị',
    },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'FALL_HEIGHT',
      name: 'Ngã từ trên cao',
    },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'ELECTRIC_SHOCK',
      name: 'Điện giật',
    },
    { type: 'INJURY_FACTOR' as const, code: 'CHEMICAL', name: 'Hóa chất' },
    { type: 'INJURY_FACTOR' as const, code: 'FIRE_EXPLOSION', name: 'Cháy nổ' },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'HEAVY_OBJECT',
      name: 'Vật nặng đè',
    },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'VEHICLE',
      name: 'Phương tiện giao thông',
    },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'COLLAPSE',
      name: 'Sập đổ công trình',
    },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'HOT_SURFACE',
      name: 'Bề mặt nóng / bỏng',
    },
    {
      type: 'INJURY_FACTOR' as const,
      code: 'SHARP_OBJECT',
      name: 'Vật sắc nhọn',
    },

    // ACCIDENT_CAUSE
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'UNSAFE_BEHAVIOR',
      name: 'Hành vi không an toàn',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'NO_PPE',
      name: 'Không sử dụng BHLĐ',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'UNSAFE_CONDITION',
      name: 'Điều kiện không an toàn',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'POOR_TRAINING',
      name: 'Thiếu đào tạo an toàn',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'FATIGUE',
      name: 'Mệt mỏi, mất tập trung',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'EQUIPMENT_FAILURE',
      name: 'Hư hỏng thiết bị',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'BAD_WEATHER',
      name: 'Thời tiết xấu',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'OVERLOAD',
      name: 'Quá tải công việc',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'PROCEDURE_VIOLATION',
      name: 'Vi phạm quy trình',
    },
    {
      type: 'ACCIDENT_CAUSE' as const,
      code: 'POOR_SUPERVISION',
      name: 'Giám sát không đầy đủ',
    },

    // INJURY_TYPE
    { type: 'INJURY_TYPE' as const, code: 'DEATH', name: 'Tử vong' },
    { type: 'INJURY_TYPE' as const, code: 'SEVERE', name: 'Thương tích nặng' },
    {
      type: 'INJURY_TYPE' as const,
      code: 'MODERATE',
      name: 'Thương tích trung bình',
    },
    { type: 'INJURY_TYPE' as const, code: 'MINOR', name: 'Thương tích nhẹ' },
    { type: 'INJURY_TYPE' as const, code: 'FRACTURE', name: 'Gãy xương' },
    { type: 'INJURY_TYPE' as const, code: 'BURN', name: 'Bỏng' },
    { type: 'INJURY_TYPE' as const, code: 'AMPUTATION', name: 'Cụt chi' },
    { type: 'INJURY_TYPE' as const, code: 'POISONING', name: 'Ngộ độc' },
    {
      type: 'INJURY_TYPE' as const,
      code: 'CONCUSSION',
      name: 'Chấn thương đầu',
    },
    {
      type: 'INJURY_TYPE' as const,
      code: 'SPRAIN',
      name: 'Bong gân / trật khớp',
    },
  ];

  const categories = await Promise.all(
    categoryData.map((c) =>
      prisma.category
        .upsert({
          where: { uq_category: { type: c.type, code: c.code } },
          update: {},
          create: c,
        })
        .catch(() => null),
    ),
  );

  const findCategory = (type: string, code: string) =>
    categories.find((c) => c?.type === type && c?.code === code) ?? null;

  // ==================================================
  // USERS (15 records: 1 admin + 2 managers + 3 staff + 9 enterprise users)
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

  const managerUsersData = [
    {
      username: 'manager01',
      email: 'manager01@example.com',
      fullName: 'Trần Văn Quản Lý 01',
      position: 'Trưởng phòng',
    },
    {
      username: 'manager02',
      email: 'manager02@example.com',
      fullName: 'Lê Thị Quản Lý 02',
      position: 'Phó trưởng phòng',
    },
  ];

  const staffUsersData = [
    {
      username: 'staff01',
      email: 'staff01@example.com',
      fullName: 'Nguyễn Văn Nhân Viên 01',
      position: 'Chuyên viên',
    },
    {
      username: 'staff02',
      email: 'staff02@example.com',
      fullName: 'Trần Thị Nhân Viên 02',
      position: 'Kế toán viên',
    },
    {
      username: 'staff03',
      email: 'staff03@example.com',
      fullName: 'Lê Văn Nhân Viên 03',
      position: 'Thanh tra viên',
    },
  ];

  const enterpriseUsersData = [
    {
      username: 'enterprise01',
      email: 'ent01@example.com',
      fullName: 'Nguyễn Văn A',
    },
    {
      username: 'enterprise02',
      email: 'ent02@example.com',
      fullName: 'Trần Thị B',
    },
    {
      username: 'enterprise03',
      email: 'ent03@example.com',
      fullName: 'Lê Văn C',
    },
    {
      username: 'enterprise04',
      email: 'ent04@example.com',
      fullName: 'Phạm Thị D',
    },
    {
      username: 'enterprise05',
      email: 'ent05@example.com',
      fullName: 'Hoàng Văn E',
    },
    {
      username: 'enterprise06',
      email: 'ent06@example.com',
      fullName: 'Vũ Thị F',
    },
    {
      username: 'enterprise07',
      email: 'ent07@example.com',
      fullName: 'Đặng Văn G',
    },
    {
      username: 'enterprise08',
      email: 'ent08@example.com',
      fullName: 'Bùi Thị H',
    },
    {
      username: 'enterprise09',
      email: 'ent09@example.com',
      fullName: 'Ngô Văn I',
    },
  ];

  const managerUsers = await Promise.all(
    managerUsersData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: { position: u.position },
        create: { ...u, passwordHash, roleId: managerRole.id },
      }),
    ),
  );

  const staffUsers = await Promise.all(
    staffUsersData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: { position: u.position },
        create: { ...u, passwordHash, roleId: staffRole.id },
      }),
    ),
  );

  const enterpriseUsers = await Promise.all(
    enterpriseUsersData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: { ...u, passwordHash, roleId: enterpriseRole.id },
      }),
    ),
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
      businessTypeId: businessTypeCodeToIdMap['120'] || 1,
      businessFieldId: codeToIdMap['10'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['160'] || 1,
      businessFieldId: codeToIdMap['011'] || 1,
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
      businessTypeId: businessTypes[2].id,
      businessFieldId: codeToIdMap['01'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['110'] || 1,
      businessFieldId: codeToIdMap['05'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['160'] || 1,
      businessFieldId: codeToIdMap['03'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['160'] || 1,
      businessFieldId: codeToIdMap['10'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['120'] || 1,
      businessFieldId: codeToIdMap['101'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['160'] || 1,
      businessFieldId: codeToIdMap['106'] || 1,
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
      businessTypeId: businessTypeCodeToIdMap['110'] || 1,
      businessFieldId: codeToIdMap['0510'] || 1,
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
      }),
    ),
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
    {
      year: 2020,
      periodType: 'YEAR' as const,
      reportName: 'Báo cáo năm 2020',
      status: 'CLOSED' as const,
    },
    {
      year: 2021,
      periodType: 'HALF_YEAR' as const,
      reportName: 'Báo cáo 6 tháng 2021',
      status: 'CLOSED' as const,
    },
    {
      year: 2021,
      periodType: 'YEAR' as const,
      reportName: 'Báo cáo năm 2021',
      status: 'CLOSED' as const,
    },
    {
      year: 2022,
      periodType: 'HALF_YEAR' as const,
      reportName: 'Báo cáo 6 tháng 2022',
      status: 'CLOSED' as const,
    },
    {
      year: 2022,
      periodType: 'YEAR' as const,
      reportName: 'Báo cáo năm 2022',
      status: 'CLOSED' as const,
    },
    {
      year: 2023,
      periodType: 'HALF_YEAR' as const,
      reportName: 'Báo cáo 6 tháng 2023',
      status: 'CLOSED' as const,
    },
    {
      year: 2023,
      periodType: 'YEAR' as const,
      reportName: 'Báo cáo năm 2023',
      status: 'CLOSED' as const,
    },
    {
      year: 2024,
      periodType: 'HALF_YEAR' as const,
      reportName: 'Báo cáo 6 tháng 2024',
      status: 'CLOSED' as const,
    },
    {
      year: 2024,
      periodType: 'YEAR' as const,
      reportName: 'Báo cáo năm 2024',
      status: 'CLOSED' as const,
    },
    {
      year: 2025,
      periodType: 'YEAR' as const,
      reportName: 'Báo cáo năm 2025',
      status: 'OPEN' as const,
    },
  ];

  const reportPeriods = await Promise.all(
    periodData.map((p) =>
      prisma.reportPeriod.upsert({
        where: { uq_report_period: { year: p.year, periodType: p.periodType } },
        update: {},
        create: p,
      }),
    ),
  );

  // ==================================================
  // REPORTS (10 records — 1 per approved enterprise × recent period)
  // ==================================================
  const approvedEnterprises = enterprises.filter(
    (_, i) => enterprisesData[i]?.status === 'APPROVED',
  );

  const latestPeriod = reportPeriods[reportPeriods.length - 1]; // 2025 YEAR

  const reportsData = approvedEnterprises.slice(0, 10).map((ent, i) => ({
    enterpriseId: ent.id,
    reportPeriodId: latestPeriod.id,
    createdBy: enterpriseUsers[i]?.id ?? enterpriseUsers[0].id,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    status: (i % 3 === 0 ? 'DRAFT' : i % 3 === 1 ? 'SUBMITTED' : 'APPROVED') as
      | 'DRAFT'
      | 'SUBMITTED'
      | 'APPROVED',
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
        where: {
          enterpriseId: r.enterpriseId,
          reportPeriodId: r.reportPeriodId,
        },
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
  console.log(`   BusinessFields: ${businessFieldsData.length}`);
  console.log(`   Categories: ${categoryData.length} (across 4 types)`);
  console.log(`   Users: ${enterpriseUsers.length + managerUsers.length + staffUsers.length + 1}`);
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
