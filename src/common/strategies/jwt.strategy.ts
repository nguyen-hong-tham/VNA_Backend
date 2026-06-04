import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../repositories/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token: string | null = null;
          if (request && request.cookies) {
            const cookies = request.cookies as Record<string, string>;
            token = cookies['access_token'] || null;
          }
          return token || ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key',
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, enterpriseProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Người dùng không tồn tại hoặc phiên đăng nhập đã hết hạn',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản này đã bị khóa');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user as any;
    if (result.birthDate && result.birthDate instanceof Date) {
      result.birthDate = result.birthDate.toISOString().split('T')[0];
    }
    if (result.enterpriseProfile?.licenseIssueDate instanceof Date) {
      result.enterpriseProfile.licenseIssueDate =
        result.enterpriseProfile.licenseIssueDate.toISOString().split('T')[0];
    }
    return result;
  }
}
