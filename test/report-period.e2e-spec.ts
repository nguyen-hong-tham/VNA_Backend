import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/repositories/prisma.service';

describe('Report Period Management e2e Tests', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let enterpriseToken: string;
  let createdPeriodId: number;

  const testYear = 2099;

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

    // Dọn dẹp dữ liệu thừa từ các lần chạy lỗi trước đó (nếu có)
    await prisma.reportPeriod.deleteMany({
      where: { year: testYear },
    });

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
    // Dọn dẹp dữ liệu test
    if (createdPeriodId) {
      await prisma.reportPeriod.delete({ where: { id: createdPeriodId } }).catch(() => { });
    }
    await prisma.reportPeriod.deleteMany({
      where: { year: testYear },
    }).catch(() => { });
    await app.close();
  });

  describe('POST /report-periods (Tạo mới)', () => {
    it('Security Path: Nên chặn quyền tạo mới của Doanh nghiệp với mã lỗi 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/report-periods')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({
          reportName: 'Kỳ báo cáo E2E test',
          year: testYear,
          periodType: 'YEAR',
          startDate: '01/01/2099',
          endDate: '31/12/2099',
          status: 'OPEN',
        });
      expect(res.status).toBe(403);
    });

    it('Happy Path: Admin tạo kỳ báo cáo Cả năm thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/report-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportName: 'Kỳ báo cáo E2E test Cả năm',
          year: testYear,
          periodType: 'YEAR',
          startDate: '01/01/2099',
          endDate: '31/12/2099',
          status: 'OPEN',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdPeriodId = res.body.id;
      expect(res.body.year).toBe(testYear);
      expect(res.body.periodType).toBe('YEAR');
    });

    it('Validation Path: Báo lỗi nếu ngày bắt đầu >= ngày kết thúc (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/report-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportName: 'Lỗi ngày bắt đầu lớn hơn kết thúc',
          year: testYear,
          periodType: 'HALF_YEAR',
          startDate: '30/06/2099',
          endDate: '01/01/2099',
          status: 'OPEN',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('bắt đầu phải trước ngày kết thúc');
    });



    it('Negative Path: Không cho phép tạo trùng Năm + Loại kỳ báo cáo (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/report-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportName: 'Kỳ báo cáo Trùng Lặp',
          year: testYear,
          periodType: 'YEAR',
          startDate: '01/01/2099',
          endDate: '31/12/2099',
          status: 'OPEN',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /report-periods (Lấy danh sách)', () => {
    it('Happy Path: Admin lấy danh sách kỳ báo cáo thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/report-periods')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      const found = res.body.data.some((p: any) => p.id === createdPeriodId);
      expect(found).toBe(true);
    });

    it('Happy Path: Doanh nghiệp cũng lấy được danh sách kỳ báo cáo', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/report-periods')
        .set('Authorization', `Bearer ${enterpriseToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('Happy Path: Lọc danh sách theo năm hoạt động', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/report-periods?year=${testYear}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(createdPeriodId);
    });
  });

  describe('GET /report-periods/:id (Xem chi tiết)', () => {
    it('Happy Path: Xem thông tin chi tiết của kỳ báo cáo vừa tạo', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/report-periods/${createdPeriodId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdPeriodId);
      expect(res.body.reportName).toBe('Kỳ báo cáo E2E test Cả năm');
    });

    it('Negative Path: Trả về 404 nếu không tìm thấy ID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/report-periods/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /report-periods/:id (Cập nhật)', () => {
    it('Happy Path: Admin chỉnh sửa thông tin kỳ báo cáo thành công', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/report-periods/${createdPeriodId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: '01/01/2099',
          endDate: '31/12/2099',
          status: 'OPEN',
        });

      expect(res.status).toBe(200);
      expect(res.body.reportName).toBe('Kỳ báo cáo E2E test Cả năm');
    });
  });

  describe('PATCH /report-periods/:id/status (Chuyển trạng thái)', () => {
    it('Happy Path: Admin bật/tắt đóng mở kỳ báo cáo thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/report-periods/${createdPeriodId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'CLOSED',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CLOSED');
    });
  });

  describe('DELETE /report-periods/:id (Xóa)', () => {
    it('Happy Path: Admin xóa kỳ báo cáo thành công', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/report-periods/${createdPeriodId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Xác thực lại ID đã bị xóa hẳn trong Database
      const check = await prisma.reportPeriod.findUnique({
        where: { id: createdPeriodId },
      });
      expect(check).toBeNull();
    });
  });
});
