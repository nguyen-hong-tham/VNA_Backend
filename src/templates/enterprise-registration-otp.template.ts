export const getEnterpriseRegistrationOtpTemplate = (
  name: string,
  otp: string,
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Mã OTP Xác thực Đăng ký</title>
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
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #0f766e;
        }
        .description {
          font-size: 15px;
          color: #475569;
          margin-bottom: 25px;
        }
        .otp-container {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background-color: #f0fdf4;
          border: 2px dashed #10b981;
          border-radius: 8px;
        }
        .otp-code {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #059669;
          margin: 0;
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
          <h1>VNA - Đăng ký tài khoản doanh nghiệp</h1>
        </div>
        <div class="content">
          <div class="welcome-text">Xin chào quý Doanh nghiệp,</div>
          <div class="description">
            Quý doanh nghiệp <strong>${name}</strong> đang thực hiện đăng ký tài khoản trên hệ thống quản lý cơ sở dữ liệu An toàn vệ sinh lao động. <br><br>
            Dưới đây là mã xác thực OTP của quý doanh nghiệp:
          </div>
          <div class="otp-container">
            <p class="otp-code">${otp}</p>
          </div>
          <div class="description">
            Lưu ý quan trọng: Mã OTP này có hiệu lực trong <strong>5 phút</strong>. <br>
            Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn thông tin đăng ký.
          </div>
          <div class="expiry-warning">
            Nếu quý doanh nghiệp không thực hiện yêu cầu này, vui lòng bỏ qua email này.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
