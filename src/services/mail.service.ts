import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { getWelcomeTemplate } from '../templates/welcome.template';
import { getPasswordResetOtpTemplate } from '../templates/password-reset.template';
import { getEmailChangeOtpTemplate } from '../templates/email-change-otp.template';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetOtpEmail(
    email: string,
    name: string | null,
    username: string | undefined,
    otp: string,
  ): Promise<void> {
    const htmlContent = getPasswordResetOtpTemplate(name, username, otp);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: email,
        subject: '🔑 Mã OTP khôi phục mật khẩu tài khoản',
        html: htmlContent,
      });
      this.logger.log(`Password reset OTP email successfully sent to ${email}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send password reset OTP email to ${email}`,
        err.stack,
      );
      throw error;
    }
  }

  async sendEmailChangeOtpEmail(
    email: string,
    name: string | null,
    otp: string,
  ): Promise<void> {
    const htmlContent = getEmailChangeOtpTemplate(name, email, otp);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: email,
        subject: '✉️ Mã OTP thay đổi địa chỉ email',
        html: htmlContent,
      });
      this.logger.log(`Email change OTP email successfully sent to ${email}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send email change OTP email to ${email}`,
        err.stack,
      );
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string | null): Promise<void> {
    const htmlContent = getWelcomeTemplate(name);

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: email,
        subject: '🚀 Đăng ký tài khoản doanh nghiệp thành công',
        html: htmlContent,
      });
      this.logger.log(`Welcome email successfully sent to ${email}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send welcome email to ${email}`, err.stack);
    }
  }
}
