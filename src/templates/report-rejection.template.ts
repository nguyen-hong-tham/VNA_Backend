export const getReportRejectionTemplate = (
    enterpriseName: string,
    taxCode: string,
    reason: string,
    endDate: string,
): string => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thông báo từ chối hồ sơ báo cáo</title>
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
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 15px;
        }
        .reason-box {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 15px;
          margin: 20px 0;
          font-style: italic;
          color: #991b1b;
        }
        .footer-note {
          font-size: 14px;
          color: #475569;
          margin-top: 20px;
        }
        .deadline {
          font-weight: bold;
          color: #dc2626;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>THÔNG BÁO TỪ CHỐI HỒ SƠ BÁO CÁO</h1>
        </div>
        <div class="content">
          <div class="title">Kính gửi Ban quản trị doanh nghiệp ${enterpriseName},</div>
          <p>Sở Lao động - Thương binh và Xã hội thông báo hồ sơ báo cáo tai nạn lao động định kỳ của doanh nghiệp (Mã số thuế: <strong>${taxCode}</strong>) đã bị <strong>TỪ CHỐI TIẾP NHẬN</strong> với lý do cụ thể như sau:</p>
          
          <div class="reason-box">
            "${reason}"
          </div>
          
          <p class="footer-note">Yêu cầu doanh nghiệp hoàn thành chỉnh sửa và nộp lại báo cáo trước ngày: <span class="deadline">${endDate}</span>.</p>
          <p>Vui lòng đăng nhập vào hệ thống để cập nhật lại số liệu báo cáo.</p>
          <p>Trân trọng,<br>Sở Lao động - Thương binh và Xã hội.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};