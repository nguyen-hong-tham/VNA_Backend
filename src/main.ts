import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { PrismaService } from './repositories/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable cookie parser middleware for reading JWT from HTTP-only cookies
  app.use(cookieParser());

  // Global Validation pipe for auto validation using class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS configuration to support frontend requests with credentials (cookies)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4000',
    credentials: true,
  });

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VNA Backend API')
    .setDescription(
      'Hệ thống Backend API cho quản lý báo cáo tai nạn lao động doanh nghiệp (VNA).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Nhập token JWT của bạn tại đây để kiểm tra các API bảo mật',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Dynamically query database for min/max years and inject into all Swagger query parameters named 'year'
  let yearsEnum = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  try {
    const prisma = app.get(PrismaService);
    const agg = await prisma.reportPeriod.aggregate({
      _min: { year: true },
      _max: { year: true },
    });
    if (agg._min.year && agg._max.year) {
      yearsEnum = [];
      for (let y = agg._min.year; y <= agg._max.year; y++) {
        yearsEnum.push(y);
      }
    }
  } catch (e) {
    console.warn('Failed to query years for Swagger enum, using fallback range.', e);
  }

  if (document.paths) {
    for (const pathKey of Object.keys(document.paths)) {
      const pathItem = document.paths[pathKey];
      for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
        const operation = pathItem[method];
        if (operation && operation.parameters) {
          const yearParam = operation.parameters.find(
            (p: any) => p.name === 'year' && p.in === 'query',
          ) as any;
          if (yearParam) {
            yearParam.schema = {
              type: 'integer',
              enum: yearsEnum,
            };
          }
        }
      }
    }
  }

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(
    `📖 Swagger API documentation is available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap().catch((err) => console.error(err));
