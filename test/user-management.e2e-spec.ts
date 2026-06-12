import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/repositories/prisma.service';

describe('User Management e2e Tests', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let enterpriseToken: string;
  let createdUserId: number;

  let staffRoleId: number;
  let enterpriseRoleId: number;

  beforeAll(async () => {
    jest.setTimeout(30000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Áp dụng prefix và global pipes giống hệt main.ts để NestJS thực thi validation
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

    // Lấy động role IDs từ Database để tránh lệch ID do seed auto-increment
    const staffRole = await prisma.role.findUnique({ where: { code: 'STAFF' } });
    staffRoleId = staffRole?.id || 3;

    const enterpriseRole = await prisma.role.findUnique({ where: { code: 'ENTERPRISE' } });
    enterpriseRoleId = enterpriseRole?.id || 4;

    // 1. Login as Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456' });
    adminToken = adminLoginRes.body.accessToken;

    // 2. Login as Enterprise
    const entLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'enterprise01', password: '123456' });
    enterpriseToken = entLoginRes.body.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users/get-all', () => {
    it('Happy Path: Should get all internal staff users with Admin token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/get-all')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      // Verify no Enterprise (roleId = enterpriseRoleId) is returned
      const containsEnterprise = res.body.data.some((u: any) => u.roleId === enterpriseRoleId);
      expect(containsEnterprise).toBe(false);
    });

    it('Security Path: Should block requests from Enterprise users with 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/get-all')
        .set('Authorization', `Bearer ${enterpriseToken}`);
      expect(res.status).toBe(403);
    });

    it('Security Path: Should block request without token with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/users/get-all');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /users', () => {
    const uniqueUsername = `staff_${Date.now()}`;
    const uniqueEmail = `staff_${Date.now()}@gmail.com`;

    it('Happy Path: Should create a new user with default password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: uniqueUsername,
          fullName: 'Staff Test e2e',
          email: uniqueEmail,
          roleId: staffRoleId,
          birthDate: '15/08/1997',
          gender: 'Nam',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdUserId = res.body.id;
    });

    it('Negative Path: Should fail to create with duplicate username', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: uniqueUsername,
          fullName: 'Staff Duplicate',
          email: `other_${Date.now()}@gmail.com`,
          roleId: staffRoleId,
        });

      expect(res.status).toBe(409);
    });

    it('Negative Path: Should fail to create with duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `other_${Date.now()}`,
          fullName: 'Staff Duplicate Email',
          email: uniqueEmail,
          roleId: staffRoleId,
        });

      expect(res.status).toBe(409);
    });

    it('Validation Path: Should block invalid day for birthDate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `staff_v_${Date.now()}`,
          fullName: 'Staff Invalid Birthdate',
          email: `staff_v_${Date.now()}@gmail.com`,
          roleId: staffRoleId,
          birthDate: '31/02/1997', // February 31st
        });

      expect(res.status).toBe(400);
    });

    it('Validation Path: Should block future date for birthDate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `staff_v2_${Date.now()}`,
          fullName: 'Staff Future Birthdate',
          email: `staff_v2_${Date.now()}@gmail.com`,
          roleId: staffRoleId,
          birthDate: '01/01/2050',
        });

      expect(res.status).toBe(400);
    });

    it('Fixed Bug 2: Creating user with gender > 20 characters is blocked by ValidationPipe (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `staff_g_${Date.now()}`,
          fullName: 'Staff Long Gender',
          email: `staff_g_${Date.now()}@gmail.com`,
          roleId: staffRoleId,
          gender: 'NamNamNamNamNamNamNamNamNamNam', // 30 chars
        });

      console.log('--- FIXED BUG 2: Long Gender Response Status =', res.status);
      expect(res.status).toBe(400); // Confirmed Fixed!
    });

    it('Fixed Bug 3: Direct creation of Enterprise role 4 is blocked with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: `staff_r_${Date.now()}`,
          fullName: 'Staff Assigned Enterprise Role',
          email: `staff_r_${Date.now()}@gmail.com`,
          roleId: enterpriseRoleId, // Enterprise role
        });

      console.log('--- FIXED BUG 3: Enterprise Role Assignment Status =', res.status);
      expect(res.status).toBe(400); // Confirmed Fixed!
    });
  });

  describe('PUT /users/:id', () => {
    it('Fixed Bug 1: Omission of birthDate preserves existing birthDate (Data Loss Prevented)', async () => {
      // 1. Verify user currently has a birthdate
      const getRes1 = await request(app.getHttpServer())
        .get('/api/users/get-all')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const targetUser = getRes1.body.data.find((u: any) => u.id === createdUserId);
      expect(targetUser.birthDate).toBeDefined();
      expect(targetUser.birthDate).not.toBeNull();

      // 2. Perform PUT request without sending "birthDate"
      const putRes = await request(app.getHttpServer())
        .put(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Staff Test e2e Updated',
          email: targetUser.email,
          roleId: staffRoleId,
        });
      expect(putRes.status).toBe(200);

      // 3. Check if birthdate remains preserved (not NULL) in database
      const getRes2 = await request(app.getHttpServer())
        .get('/api/users/get-all')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const updatedUser = getRes2.body.data.find((u: any) => u.id === createdUserId);
      console.log('--- FIXED BUG 1: birthDate after Update =', updatedUser.birthDate);
      expect(updatedUser.birthDate).not.toBeNull(); // Confirmed Fixed!
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('Happy Path: Should update user status to false', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
    });

    it('Security Path: Admin cannot deactivate their own account', async () => {
      // Find Admin ID
      const getRes = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const adminId = getRes.body.user.id;

      const res = await request(app.getHttpServer())
        .patch(`/api/users/${adminId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
    });

    it('Fixed Bug 5: Empty body/null on status API is blocked with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      console.log('--- FIXED BUG 5 (Status API - Empty Body) Status =', res.status);
      expect(res.status).toBe(400); // ValidationPipe blocks empty body

      const resNull = await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: null });
      console.log('--- FIXED BUG 5 (Status API - Null Value) Status =', resNull.status);
      expect(resNull.status).toBe(400); // ValidationPipe blocks null
    });
  });

  describe('POST /users/bulk-delete', () => {
    it('Fixed Bug 5: Empty body on bulk-delete API is blocked with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); 

      console.log('--- FIXED BUG 5 (Bulk Delete - Empty Body) Status =', res.status);
      expect(res.status).toBe(400); // ValidationPipe blocks empty body
    });

    it('Happy Path: Delete the created test user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users/bulk-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [createdUserId] });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /users/roles and GET /users/positions', () => {
    it('Should fetch roles successfully and not contain ENTERPRISE', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const hasEnterprise = res.body.some((r: any) => r.code === 'ENTERPRISE');
      expect(hasEnterprise).toBe(false);
    });

    it('Should fetch positions successfully', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/positions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
