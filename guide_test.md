# HƯỚNG DẪN KIỂM THỬ THỦ CÔNG HỆ THỐNG QUẢN LÝ NGƯỜI DÙNG (guide_test.md)

Tài liệu này hướng dẫn chi tiết từng bước kiểm thử thủ công chức năng của nhóm API **Users (Thông tin cá nhân)** và **User Management (Quản lý Cán bộ)** trên môi trường local thông qua giao diện **Swagger UI** và đối chiếu dữ liệu trực tiếp trong **Database**.

---

## BƯỚC 1: KHỞI ĐỘNG HỆ THỐNG & DỮ LIỆU
1. Khởi chạy ứng dụng NestJS ở chế độ phát triển:
   ```bash
   npm run start:dev
   ```
   *Máy chủ chạy tại địa chỉ mặc định:* `http://localhost:3000/api`
2. Mở trình duyệt truy cập giao diện tài liệu API Swagger:
   ```url
   http://localhost:3000/api/docs
   ```
3. Khởi chạy giao diện quản lý Database Prisma Studio để dễ dàng đối chiếu dữ liệu:
   ```bash
   npx prisma studio
   ```
   *Giao diện mở tại địa chỉ:* `http://localhost:5555`

---

## BƯỚC 2: ĐĂNG NHẬP & LẤY MÃ XÁC THỰC (ACCESS TOKEN)
Để thực hiện các API, bạn cần đăng nhập để lấy token.

1. Tìm nhóm API **Auth** trên Swagger.
2. Mở API `POST /api/auth/login` và click nút **Try it out**.
3. Nhập payload đăng nhập dưới đây (tài khoản Admin):
   ```json
   {
     "username": "admin",
     "password": "123456"
   }
   ```
4. Nhấn **Execute**. Nhận phản hồi `200 OK` chứa mã token:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```
5. Sao chép toàn bộ chuỗi `accessToken` (không bao gồm dấu ngoặc kép).
6. Cuộn lên đầu trang Swagger, nhấn nút **Authorize** (nút hình khóa màu xanh lá).
7. Nhập vào ô Value định dạng: `Bearer <accessToken_vừa_copy>`. Nhấn **Authorize** rồi nhấn **Close**.
*(Bây giờ tất cả các request gửi đi từ Swagger sẽ được đính kèm Token này ở Header).*

---

## BƯỚC 3: KỊCH BẢN KIỂM THỬ PHÂN CHIA CONTROLLERS

Sau khi phân tách, các API được chia thành 2 nhóm thẻ (Tag) trên Swagger:

---

### PHẦN I: THÔNG TIN CÁ NHÂN & TỰ QUẢN LÝ (Swagger Tag: `Users`)

Các API này phục vụ cho tài khoản cá nhân của người dùng đang đăng nhập:

#### 1. API Lấy thông tin tài khoản hiện tại (`GET /api/users/me`)
*   **Mục tiêu**: Đảm bảo lấy đúng thông tin tài khoản đang đăng nhập.
*   **Cách test**: Click **Try it out** và nhấn **Execute**.
*   **Kết quả mong đợi**: Trả về trạng thái `200 OK` chứa thông tin user của Admin (ID = 1, username = "admin").

#### 2. API Cập nhật thông tin cá nhân (`PUT /api/users/profile`)
*   **Cách test**: Click **Try it out**, điền payload cập nhật họ tên, địa chỉ...
*   **Kết quả mong đợi**: Cập nhật thành công, trả về dữ liệu mới.

#### 3. API Tải lên avatar cá nhân (`POST /api/users/avatar`)
*   **Mục tiêu**: Tải lên và cập nhật avatar cho chính mình (giới hạn 2MB).
*   **Cách test**: Click **Try it out**, chọn một file ảnh có dung lượng < 2MB.
*   **Kết quả mong đợi**: Trả về `200 OK` kèm đường dẫn ảnh.
*   **Validation test**: Tải lên file > 2MB hoặc file không phải là định dạng ảnh (ví dụ `.txt`, `.pdf`). Hệ thống phải trả về `400 Bad Request` báo dung lượng vượt quá 2MB hoặc sai định dạng.

#### 4. API Thay đổi mật khẩu cá nhân (`POST /api/users/change-password`)
*   **Cách test**: Điền mật khẩu cũ, mật khẩu mới và thực hiện.
*   **Kết quả mong đợi**: Trực tiếp thay đổi mật khẩu và cập nhật `tokenVersion` trong DB để ép các thiết bị khác phải đăng nhập lại.

---

### PHẦN II: QUẢN TRỊ VIÊN QUẢN LÝ CÁN BỘ (Swagger Tag: `User Management`)

Các API này chỉ cho phép Admin (hoặc Manager/Staff tùy quyền hạn) truy cập và quản lý các cán bộ khác:

#### 1. API Lấy danh sách cán bộ nội bộ (`GET /api/users/get-all`)
*   **Mục tiêu**: Lấy danh sách cán bộ, tìm kiếm, lọc phân trang và hoàn toàn loại trừ các tài khoản Doanh nghiệp (Enterprise).
*   **Cách test**: Click **Try it out** và nhấn **Execute**.
*   **Kết quả mong đợi**: Trả về `200 OK` kèm danh sách cán bộ. Không được chứa tài khoản nào thuộc nhóm Doanh nghiệp.

#### 2. API Tải lên ảnh đại diện cho tài khoản khác (`POST /api/users/upload-avatar`)
*   **Mục tiêu**: Tải lên avatar cho tài khoản khác trước khi Lưu (tránh ghi đè avatar của chính Admin). Giới hạn kích thước tối đa 5MB.
*   **Cách test**: Click **Try it out**, chọn file ảnh định dạng `.jpg`, `.jpeg`, `.png`, `.gif` hoặc `.webp` có dung lượng dưới 5MB. Nhấn **Execute**.
*   **Kết quả mong đợi**: Trả về `201 Created` kèm theo đường dẫn URL của file ảnh trên Supabase Storage.
*   **Validation test**: 
    - Chọn file > 5MB -> Trả về `400 Bad Request` ("Dung lượng file không được vượt quá 5MB").
    - Chọn file không phải định dạng ảnh (ví dụ `.xlsx`) -> Trả về `400 Bad Request` báo định dạng không hợp lệ.

#### 3. API Tạo cán bộ nội bộ mới (`POST /api/users`)
*   **Các trường hợp kiểm thử (Test Cases)**:
    *   **Case 3.1: Tạo tài khoản hợp lệ (Happy Path)**:
        *   Payload mẫu:
            ```json
            {
              "username": "tester_new_01",
              "fullName": "Kiểm Thử Viên 01",
              "email": "tester_new_01@gmail.com",
              "roleId": 3,
              "birthDate": "20/05/1996",
              "gender": "Nam",
              "avatarUrl": "https://<supabase-domain>/storage/v1/object/public/..."
            }
            ```
        *   **Kết quả mong đợi**: Trả về `201 Created` kèm thông tin ID của người dùng vừa tạo.
    *   **Case 3.2: Kiểm tra lỗi trùng Email chữ hoa/thường (Bug 4 - Đã sửa)**:
        *   Tạo tài khoản mới với email viết hoa ngẫu nhiên nhưng đã tồn tại (ví dụ: `TeStEr_NeW_01@GmAil.CoM`).
        *   **Kết quả mong đợi**: Hệ thống tự động chuyển email về chữ thường và chặn lại, trả về mã lỗi `409 Conflict`.
    *   **Case 3.3: Kiểm tra lỗi gán trực tiếp vai trò Doanh nghiệp (Bug 3 - Đã sửa)**:
        *   Gửi request với `roleId` là 4 (vai trò Doanh nghiệp/ENTERPRISE).
        *   **Kết quả mong đợi**: Hệ thống ném lỗi `400 Bad Request` ("Không được phép gán vai trò Doanh nghiệp thông qua chức năng này").
    *   **Case 3.4: Kiểm tra độ dài Giới tính (Bug 2 - Đã sửa)**:
        *   Gửi request tạo tài khoản với chuỗi `gender` dài quá 20 ký tự.
        *   **Kết quả mong đợi**: ValidationPipe chặn ngay lập tức, trả về `400 Bad Request` thay vì để sập database.

#### 4. API Cập nhật thông tin chi tiết cán bộ (`PUT /api/users/{id}`)
*   **Các trường hợp kiểm thử**:
    *   **Case 4.1: Cập nhật không gửi trường ngày sinh (Bug 1 - Đã sửa)**:
        *   Gửi request `PUT /api/users/{id}` và bỏ hoàn toàn trường `birthDate` ra khỏi payload.
        *   **Kết quả mong đợi**: Trả về `200 OK`. Ngày sinh của user trong DB vẫn giữ nguyên, không bị đè thành NULL (Data Loss).
    *   **Case 4.2: Muốn xóa ngày sinh một cách chủ động**:
        *   Gửi request `PUT` truyền trực tiếp giá trị `null` cho trường `birthDate`.
        *   **Kết quả mong đợi**: Trả về `200 OK` và ngày sinh trong DB được cập nhật thành `NULL`.

#### 5. API Kích hoạt hoặc khóa tài khoản cán bộ (`PATCH /api/users/{id}/status`)
*   **Case 5.1: Gửi body trống hoặc null (Bug 5 - Đã sửa)**:
    *   Gửi request với body `{}` hoặc `{ "isActive": null }`.
    *   **Kết quả mong đợi**: Trả về `400 Bad Request` báo lỗi validate, không crash server.
*   **Case 5.2: Admin tự khóa chính mình**:
    *   Truyền ID của Admin hiện tại (ID = 1) và gửi request `{ "isActive": false }`.
    *   **Kết quả mong đợi**: Trả về `400 Bad Request` ("Bạn không thể tự khóa tài khoản của chính mình").

#### 6. API Xóa nhiều cán bộ cùng lúc (`POST /api/users/bulk-delete`)
*   **Case 6.1: Gửi request body trống `{}` (Bug 5 - Đã sửa)**:
    *   Gửi request body trống `{}`.
    *   **Kết quả mong đợi**: Trả về `400 Bad Request` (yêu cầu mảng `ids`).
*   **Case 6.2: Xóa danh sách chứa ID của chính Admin đang thao tác**:
    *   Gửi danh sách chứa ID của Admin (ví dụ: `[1, 9999]`).
    *   **Kết quả mong đợi**: Hệ thống tự động lọc bỏ ID của Admin ra khỏi danh sách cần xóa để bảo vệ tài khoản Admin hiện tại.

#### 7. API Nhập cán bộ từ Excel (`POST /api/users/import`)
*   **Case 7.1: Tải lên file quá dung lượng cho phép (>5MB) (Bug 6 - Đã sửa)**:
    *   Chọn file dung lượng > 5MB hoặc file sai định dạng (ví dụ `.txt`, `.png`).
    *   **Kết quả mong đợi**: Hệ thống chặn ở bộ lọc `ParseFilePipe`, trả về `400 Bad Request`.
*   **Case 7.2: Kiểm tra hiệu năng xử lý (Bug 8 - Đã sửa)**:
    *   Tải lên file Excel mẫu chứa khoảng 100 dòng thông tin nhân viên mới.
    *   **Kết quả mong đợi**: File xử lý in-memory cực nhanh (dưới 1 giây), không làm tắc nghẽn Pool truy vấn của PostgreSQL.

#### 8. API Xuất danh sách cán bộ ra Excel (`GET /api/users/export`)
*   **Cách test**: Click **Try it out** -> **Execute** -> Chọn **Download file**.
*   **Kết quả mong đợi**: Tải về tệp tin `.xlsx` danh sách cán bộ. Mở file lên kiểm tra cột **Ngày sinh**, đảm bảo hiển thị đúng định dạng ngày tương ứng với DB mà không bị lệch múi giờ (Timezone shift - Bug 7).

---

## BƯỚC 4: CÁC CÂU LỆNH TRUY VẤN DATABASE TRỰC TIẾP
Bạn có thể chạy các truy vấn SQL dưới đây thông qua DBeaver/pgAdmin để kiểm chứng tính toàn vẹn:

1. **Kiểm tra xem email của người dùng có thực sự được lưu nhất quán dạng chữ thường hay không (Bug 4)**:
   ```sql
   SELECT id, username, email FROM users WHERE email ~ '[A-Z]';
   ```
   *(Kỳ vọng: 0 bản ghi).*

2. **Kiểm tra xem có bất kỳ cán bộ nội bộ nào bị gán nhầm vai trò Doanh nghiệp (roleId = 4) mà không có Profile liên kết hay không (Bug 3)**:
   ```sql
   SELECT u.id, u.username, u.email 
   FROM users u
   LEFT JOIN enterprises e ON u.id = e.user_id
   WHERE u.role_id = 4 AND e.id IS NULL;
   ```
   *(Kỳ vọng: 0 bản ghi).*
