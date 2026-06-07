import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { BusinessTypeController } from './controllers/business-type.controller';
import { BusinessFieldController } from './controllers/business-field.controller';

// Services
import { AuthService } from './services/auth.service';
import { MailService } from './services/mail.service';
import { SupabaseService } from './services/supabase.service';
import { BusinessTypeService } from './services/business-type.service';
import { BusinessFieldService } from './services/business-field.service';

// Repositories
import { PrismaService } from './repositories/prisma.service';
import { UserRepository } from './repositories/user.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { EmailChangeOtpRepository } from './repositories/email-change-otp.repository';
import { BusinessTypeRepository } from './repositories/business-type.repository';
import { BusinessFieldRepository } from './repositories/business-field.repository';

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
    BusinessTypeController,
    BusinessFieldController,
  ],
  providers: [
    AuthService,
    MailService,
    SupabaseService,
    BusinessTypeService,
    BusinessFieldService,
    PrismaService,
    UserRepository,
    PasswordResetRepository,
    EmailChangeOtpRepository,
    BusinessTypeRepository,
    BusinessFieldRepository,
    JwtStrategy,
  ],
})
export class AppModule {}
