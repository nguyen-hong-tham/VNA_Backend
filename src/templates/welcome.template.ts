export const getWelcomeTemplate = (name: string | null): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Chào mừng bạn</title>
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
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
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
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #4f46e5;
        }
        .description {
          font-size: 15px;
          color: #475569;
          margin-bottom: 30px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VNA - Hệ thống Quản lý Tai nạn Lao động</h1>
        </div>
        <div class="content">
          <div class="welcome-text">Chào mừng ${name || 'bạn'} đến với hệ thống!</div>
          <div class="description">
            Tài khoản doanh nghiệp của bạn đã được đăng ký thành công. Vui lòng chờ phê duyệt từ Sở Lao động trước khi sử dụng đầy đủ tính năng.
          </div>
          <div class="description">
            Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi bằng cách phản hồi lại email này.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 VNA. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
};
