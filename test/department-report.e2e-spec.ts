import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/repositories/prisma.service';

describe('Department Reports e2e Tests', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let enterpriseToken: string;
  let testPeriod: any;
  let enterprises: any[] = [];

  beforeAll(async () => {
    jest.setTimeout(30000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Dọn dẹp dữ liệu test cũ nếu có
    await prisma.report.deleteMany({
      where: { reportPeriod: { year: 2088 } }
    });
    await prisma.reportPeriod.deleteMany({
      where: { year: 2088 }
    });

    // Tạo kỳ báo cáo cho test
    testPeriod = await prisma.reportPeriod.create({
      data: {
        reportName: 'Kỳ báo cáo E2E test 2088',
        year: 2088,
        periodType: 'YEAR',
        startDate: new Date('2088-01-01'),
        endDate: new Date('2088-12-31'),
        status: 'OPEN',
      }
    });

    // Lấy enterprises để test
    enterprises = await prisma.enterprise.findMany({ take: 2 });

    // 1. Đăng nhập tài khoản Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456' });
    adminToken = adminLoginRes.body.accessToken;

    // 2. Đăng nhập tài khoản Doanh nghiệp
    const entLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'enterprise01', password: '123456' });
    enterpriseToken = entLoginRes.body.accessToken;
  }, 30000);

  afterAll(async () => {
    if (testPeriod) {
      await prisma.report.deleteMany({
        where: { reportPeriodId: testPeriod.id }
      });
      await prisma.reportPeriod.delete({
        where: { id: testPeriod.id }
      }).catch(() => {});
    }
    await app.close();
  });

  describe('GET /department-reports (Lấy danh sách)', () => {
    it('Security Check: Doanh nghiệp không được phép truy cập (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports')
        .set('Authorization', `Bearer ${enterpriseToken}`);
      expect(res.status).toBe(403);
    });

    it('Happy Path: Admin lấy danh sách thành công không cần truyền year (mặc định lấy năm hiện tại)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body.page).toBe(1);
    });

    it('Happy Path: Lọc danh sách theo năm cụ thể', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports?year=2022')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('Edge Case: Chặn nếu lọc theo xã (wardId) mà không lọc theo tỉnh (provinceId)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports?year=2022&wardId=27424')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('chọn tỉnh/ thành phố trước khi chọn Phường/xã');
    });

    it('Happy Path: Cho phép lọc theo xã (wardId) khi đi kèm tỉnh (provinceId)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports?year=2022&provinceId=79&wardId=27424')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('Validation Error: Chặn nếu gửi trạng thái không được cho phép (ví dụ INVALID_STATUS)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports?year=2022&status=INVALID_STATUS')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /department-reports/statistics-by-ward (Thống kê)', () => {
    it('Security Check: Doanh nghiệp không được phép truy cập (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports/statistics-by-ward?year=2022&provinceId=79')
        .set('Authorization', `Bearer ${enterpriseToken}`);
      expect(res.status).toBe(403);
    });

    it('Validation: Lỗi nếu thiếu tham số bắt buộc provinceId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports/statistics-by-ward?year=2022')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('Happy Path: Lấy thống kê thành công theo provinceId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports/statistics-by-ward?year=2022&provinceId=79')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /department-reports/bulk-approve (Duyệt hàng loạt)', () => {
    let reportIds: number[] = [];

    beforeEach(async () => {
      // Dọn dẹp các báo cáo test cũ của kỳ 2088
      await prisma.report.deleteMany({
        where: { reportPeriodId: testPeriod.id }
      });

      // Tạo các báo cáo mới ở trạng thái SUBMITTED để duyệt
      const r1 = await prisma.report.create({
        data: {
          enterpriseId: enterprises[0].id,
          reportPeriodId: testPeriod.id,
          status: 'SUBMITTED',
          createdBy: enterprises[0].userId,
        }
      });
      const r2 = await prisma.report.create({
        data: {
          enterpriseId: enterprises[1].id,
          reportPeriodId: testPeriod.id,
          status: 'SUBMITTED',
          createdBy: enterprises[1].userId,
        }
      });
      reportIds = [r1.id, r2.id];
    });

    it('Security Check: Doanh nghiệp không được phép truy cập (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-approve')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({ reportIds });
      expect(res.status).toBe(403);
    });

    it('Validation Error: Chặn nếu gửi reportIds rỗng hoặc không đúng định dạng', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reportIds: [] });
      expect(res.status).toBe(400);
    });

    it('Not Found Error: Chặn nếu có reportId không tồn tại trong hệ thống', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reportIds: [reportIds[0], 99999] });
      expect(res.status).toBe(404);
    });

    it('Bad Request Error: Chặn nếu có báo cáo không ở trạng thái SUBMITTED', async () => {
      // Cập nhật trạng thái 1 báo cáo sang REPORTING
      await prisma.report.update({
        where: { id: reportIds[1] },
        data: { status: 'REPORTING' }
      });

      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reportIds });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Chỉ có thể phê duyệt báo cáo ở trạng thái Chờ tiếp nhận');
    });

    it('Happy Path: Duyệt hàng loạt báo cáo thành công và cập nhật DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reportIds });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Kiểm tra DB thực tế
      const updatedReports = await prisma.report.findMany({
        where: { id: { in: reportIds } }
      });
      expect(updatedReports).toHaveLength(2);
      expect(updatedReports[0].status).toBe('APPROVED');
      expect(updatedReports[1].status).toBe('APPROVED');
      expect(updatedReports[0].rejectReason).toBeNull();
      expect(updatedReports[1].rejectReason).toBeNull();
    });
  });

  describe('POST /department-reports/bulk-reject (Từ chối hàng loạt)', () => {
    let reportIds: number[] = [];

    beforeEach(async () => {
      // Dọn dẹp các báo cáo test cũ của kỳ 2088
      await prisma.report.deleteMany({
        where: { reportPeriodId: testPeriod.id }
      });

      // Tạo các báo cáo mới ở trạng thái SUBMITTED để từ chối
      const r1 = await prisma.report.create({
        data: {
          enterpriseId: enterprises[0].id,
          reportPeriodId: testPeriod.id,
          status: 'SUBMITTED',
          createdBy: enterprises[0].userId,
        }
      });
      const r2 = await prisma.report.create({
        data: {
          enterpriseId: enterprises[1].id,
          reportPeriodId: testPeriod.id,
          status: 'SUBMITTED',
          createdBy: enterprises[1].userId,
        }
      });
      reportIds = [r1.id, r2.id];
    });

    it('Security Check: Doanh nghiệp không được phép truy cập (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-reject')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({
          rejectItems: reportIds.map(id => ({ reportId: id, note: 'Lý do E2E test' }))
        });
      expect(res.status).toBe(403);
    });

    it('Validation Error: Chặn nếu gửi rejectItems rỗng hoặc không đúng định dạng', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectItems: [] });
      expect(res.status).toBe(400);
    });

    it('Not Found Error: Chặn nếu có reportId không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectItems: [
            { reportId: reportIds[0], note: 'Lý do 1' },
            { reportId: 99999, note: 'Lý do 2' }
          ]
        });
      expect(res.status).toBe(404);
    });

    it('Bad Request Error: Chặn nếu có báo cáo không ở trạng thái SUBMITTED', async () => {
      // Cập nhật trạng thái 1 báo cáo sang APPROVED
      await prisma.report.update({
        where: { id: reportIds[1] },
        data: { status: 'APPROVED' }
      });

      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectItems: reportIds.map(id => ({ reportId: id, note: 'Lý do E2E test' }))
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Chỉ có thể từ chối các báo cáo đang ở trạng thái Chờ tiếp nhận');
    });

    it('Happy Path: Từ chối hàng loạt báo cáo thành công và cập nhật DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/department-reports/bulk-reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectItems: [
            { reportId: reportIds[0], note: 'Lý do từ chối E2E số 1' },
            { reportId: reportIds[1], note: 'Lý do từ chối E2E số 2' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Kiểm tra DB thực tế
      const r1 = await prisma.report.findUnique({ where: { id: reportIds[0] } });
      const r2 = await prisma.report.findUnique({ where: { id: reportIds[1] } });
      
      expect(r1?.status).toBe('REJECTED');
      expect(r1?.rejectReason).toBe('Lý do từ chối E2E số 1');
      expect(r2?.status).toBe('REJECTED');
      expect(r2?.rejectReason).toBe('Lý do từ chối E2E số 2');
    });
  });
});
