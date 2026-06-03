export const configuration = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
    from:
      process.env.SMTP_FROM || '"Antigravity Auth" <noreply@antigravity.com>',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
