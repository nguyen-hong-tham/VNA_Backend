import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { BusinessTypeController } from './controllers/business-type.controller';
import { BusinessFieldController } from './controllers/business-field.controller';
import { EnterpriseController } from './controllers/enterprise.controller';
import { EnterpriseRegistrationController } from './controllers/enterprise-registration.controller';
import { ReportController } from './controllers/report.controller';
import { ReportPeriodController } from './controllers/report-period.controller';
import { CategoryController } from './controllers/category.controller';

// Services
import { AuthService } from './services/auth.service';
import { MailService } from './services/mail.service';
import { SupabaseService } from './services/supabase.service';
import { BusinessTypeService } from './services/business-type.service';
import { BusinessFieldService } from './services/business-field.service';
import { EnterpriseService } from './services/enterprise.service';
import { UserService } from './services/user.service';
import { EnterpriseRegistrationService } from './services/enterprise-registration.service';
import { ReportService } from './services/report.service';
import { ReportPeriodService } from './services/report-period.service';
import { CategoryService } from './services/category.service';

// Repositories
import { PrismaService } from './repositories/prisma.service';
import { UserRepository } from './repositories/user.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { EmailChangeOtpRepository } from './repositories/email-change-otp.repository';
import { BusinessTypeRepository } from './repositories/business-type.repository';
import { BusinessFieldRepository } from './repositories/business-field.repository';
import { EnterpriseRepository } from './repositories/enterprise.repository';
import { ReportPeriodRepository } from './repositories/report-period.repository';
import { CategoryRepository } from './repositories/category.repository';

// Strategies
import { JwtStrategy } from './common/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [
    AuthController,
    UserController,
    UserManagementController,
    BusinessTypeController,
    BusinessFieldController,
    EnterpriseController,
    EnterpriseRegistrationController,
    ReportController,
    ReportPeriodController,
    CategoryController,
  ],
  providers: [
    AuthService,
    ReportService,
    EnterpriseRegistrationService,
    MailService,
    SupabaseService,
    BusinessTypeService,
    BusinessFieldService,
    EnterpriseService,
    UserService,
    ReportPeriodService,
    CategoryService,
    PrismaService,
    UserRepository,
    PasswordResetRepository,
    EmailChangeOtpRepository,
    BusinessTypeRepository,
    BusinessFieldRepository,
    EnterpriseRepository,
    ReportPeriodRepository,
    CategoryRepository,
    JwtStrategy,
  ],
})
export class AppModule {}
