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

    it('Validation Error: Chặn nếu gửi trạng thái không được cho phép (ví dụ REJECTED)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/department-reports?year=2022&status=REJECTED')
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
});
