import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';

// Services
import { AuthService } from './services/auth.service';
import { MailService } from './services/mail.service';
import { SupabaseService } from './services/supabase.service';

// Repositories
import { PrismaService } from './repositories/prisma.service';
import { UserRepository } from './repositories/user.repository';
import { PasswordResetRepository } from './repositories/password-reset.repository';
import { EmailChangeOtpRepository } from './repositories/email-change-otp.repository';

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
  controllers: [AuthController, UserController],
  providers: [
    AuthService,
    MailService,
    SupabaseService,
    PrismaService,
    UserRepository,
    PasswordResetRepository,
    EmailChangeOtpRepository,
    JwtStrategy,
  ],
})
export class AppModule {}
