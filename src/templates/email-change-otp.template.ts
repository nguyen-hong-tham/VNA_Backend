export const getEmailChangeOtpTemplate = (
  name: string | null,
  currentEmail: string,
  otp: string,
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mã OTP Thay đổi địa chỉ email</title>
      <style>
        body {
          font-family: 'Inter', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f5f7;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.05em;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .welcome-text {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .description {
          font-size: 15px;
          color: #475569;
          margin-bottom: 25px;
        }
        .expiry-warning {
          font-size: 13px;
          color: #94a3b8;
          text-align: center;
          margin-top: 25px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Antigravity Authentication</h1>
        </div>
        <div class="content">
          <div class="welcome-text">Xin chào, ${name || 'bạn'},</div>
          <div class="description">
            Bạn vừa yêu cầu thay đổi email cho tài khoản đăng ký với email hiện tại là ${currentEmail}. Dưới đây là mã xác thực OTP của bạn: <strong>${otp}</strong> <br>
            Lưu ý quan trọng: Mã OTP có hiệu lực trong <strong>5 phút</strong>. <br>
            Không chia sẻ mã này với bất kì ai. <br>
            Nếu bạn không yêu cầu thay đổi email, vui lòng bỏ qua email này.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
