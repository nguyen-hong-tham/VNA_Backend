# HƯỚNG DẪN KIỂM THỬ THỦ CÔNG CHỨC NĂNG QUẢN LÝ NGƯỜI DÙNG (guide_test.md)

Tài liệu này hướng dẫn chi tiết từng bước kiểm thử thủ công chức năng Quản lý Người dùng trên môi trường local thông qua giao diện **Swagger UI** và truy vấn **Database** trực tiếp để kiểm tra tính đúng đắn của dữ liệu.

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
3. Mở một terminal mới và khởi chạy giao diện quản lý Database Prisma Studio để dễ dàng đối chiếu dữ liệu:
   ```bash
   npx prisma studio
   ```
   *Giao diện mở tại địa chỉ:* `http://localhost:5555`

---

## BƯỚC 2: ĐĂNG NHẬP & LẤY MÃ XÁC THỰC (ACCESS TOKEN)
Để thực hiện các API quản trị, bạn cần đăng nhập bằng tài khoản Admin.

1. Tìm nhóm API **Auth** trên Swagger.
2. Mở API `POST /api/auth/login` và click nút **Try it out**.
3. Nhập payload đăng nhập dưới đây:
   ```json
   {
     "username": "admin",
     "password": "123456"
   }
   ```
4. Nhấn **Execute**. Nhận phản hồi `200 OK` chứa mã token:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSw..."
   }
   ```
5. Sao chép toàn bộ chuỗi `accessToken` (không bao gồm dấu ngoặc kép).
6. Cuộn lên đầu trang Swagger, nhấn nút **Authorize** (nút hình khóa màu xanh lá).
7. Nhập vào ô Value định dạng: `Bearer <accessToken_vừa_copy>`. Nhấn **Authorize** rồi nhấn **Close**.
*(Bây giờ tất cả các request gửi đi từ Swagger sẽ được đính kèm Token này ở Header).*

---

## BƯỚC 3: KỊCH BẢN KIỂM THỬ CHI TIẾT TỪNG API & TRƯỜNG HỢP LỖI

### 1. API LẤY DANH SÁCH CÁN BỘ NỘI BỘ (`GET /api/users/get-all`)
*   **Mục tiêu**: Đảm bảo admin lấy được danh sách nhân viên nội bộ và hoàn toàn loại trừ các tài khoản Doanh nghiệp (Enterprise).
*   **Cách test**:
    *   Mở API `GET /api/users/get-all` trên Swagger, click **Try it out** và nhấn **Execute**.
    *   **Kết quả mong đợi (Happy Path)**: Trả về trạng thái `200 OK` kèm danh sách cán bộ. Hãy kiểm tra các bản ghi trong danh sách xem có tài khoản nào chứa vai trò Doanh nghiệp không (đối chiếu cột vai trò hoặc role code trong DB). Kỳ vọng: **Không có tài khoản doanh nghiệp nào hiển thị ở đây**.
*   **Kiểm tra Phân quyền (RBAC)**:
    *   Đăng xuất Admin trên Swagger, đăng nhập bằng tài khoản Enterprise (ví dụ: `enterprise01` / `123456`) để lấy token Enterprise.
    *   Dùng token Enterprise để gọi API `GET /api/users/get-all`.
    *   **Kết quả mong đợi**: Trả về `403 Forbidden` (do vai trò Doanh nghiệp không được xem danh sách cán bộ nội bộ).
    *   Không gửi token (không authorize) gọi API: Trả về `401 Unauthorized`.

---

### 2. API TẠO CÁN BỘ NỘI BỘ MỚI (`POST /api/users`)
*   **Mục tiêu**: Kiểm tra ràng buộc validation đầu vào của DTO, kiểm tra trùng lặp email hoa/thường và chặn gán role trái phép.
*   **Các trường hợp kiểm thử**:

    *   **Case 2.1: Tạo tài khoản hợp lệ (Happy Path)**:
        *   Mở API `POST /api/users`, điền payload mẫu:
            ```json
            {
              "username": "tester_new_01",
              "fullName": "Kiểm Thử Viên 01",
              "email": "tester_new_01@gmail.com",
              "roleId": 3,
              "birthDate": "20/05/1996",
              "gender": "Nam"
            }
            ```
        *   **Kết quả mong đợi**: Trả về `201 Created` kèm thông tin ID của người dùng vừa tạo (lấy ID này để test các API tiếp theo).

    *   **Case 2.2: Kiểm tra lỗi trùng Email phân biệt chữ hoa/thường (Bug 4 - Đã sửa)**:
        *   Gửi request tạo tài khoản mới với email viết hoa ngẫu nhiên nhưng đã tồn tại (ví dụ: `TeStEr_NeW_01@GmAil.CoM`):
            ```json
            {
              "username": "tester_new_02",
              "fullName": "Kiểm Thử Viên Trùng Email",
              "email": "TeStEr_NeW_01@GmAil.CoM",
              "roleId": 3
            }
            ```
        *   **Kết quả mong đợi**: Hệ thống tự động chuyển email về chữ thường `tester_new_01@gmail.com` trước khi kiểm tra và chặn lại, trả về mã lỗi `409 Conflict` ("Email tester_new_01@gmail.com đã tồn tại"). *Database không bị ghi đè hay trùng lặp dữ liệu*.

    *   **Case 2.3: Kiểm tra lỗi gán trực tiếp vai trò Doanh nghiệp (Bug 3 - Đã sửa)**:
        *   Gửi request với `roleId` thuộc vai trò Doanh nghiệp (trong cơ sở dữ liệu mặc định là `4` hoặc role có code `ENTERPRISE`):
            ```json
            {
              "username": "tester_enterprise_assign",
              "fullName": "Cán Bộ Bị Gán Sai Vai Trò",
              "email": "tester_ent@gmail.com",
              "roleId": 4
            }
            ```
        *   **Kết quả mong đợi**: Hệ thống ném lỗi `400 Bad Request` ("Không được phép gán vai trò Doanh nghiệp thông qua chức năng này") để tránh lỗi liên kết dữ liệu.

    *   **Case 2.4: Kiểm tra độ dài Giới tính (Bug 2 - Đã sửa)**:
        *   Gửi request tạo tài khoản với chuỗi `gender` dài quá 20 ký tự (ví dụ: `"NamNamNamNamNamNamNamNamNamNam"`):
            ```json
            {
              "username": "tester_gender_long",
              "fullName": "Cán Bộ Giới Tính Dài",
              "email": "gender_long@gmail.com",
              "roleId": 3,
              "gender": "NamNamNamNamNamNamNamNamNamNam"
            }
            ```
        *   **Kết quả mong đợi**: ValidationPipe ở Controller chặn ngay lập tức, trả về `400 Bad Request` kèm chi tiết lỗi `gender` vượt quá giới hạn tối đa cho phép. Không làm sập ứng dụng hay ném lỗi DB 500.

    *   **Case 2.5: Kiểm tra định dạng ngày sinh**:
        *   Thử gửi ngày sinh không tồn tại trong lịch (`31/02/1997`) hoặc ngày sinh trong tương lai (`01/01/2050`).
        *   **Kết quả mong đợi**: Trả về `400 Bad Request` thông báo ngày sinh không hợp lệ.

---

### 3. API CẬP NHẬT THÔNG TIN NGƯỜI DÙNG (`PUT /api/users/{id}`)
*   **Mục tiêu**: Kiểm tra phòng chống mất ngày sinh (Data Loss) khi cập nhật thông tin.
*   **Cách test**:
    *   Sử dụng ID của người dùng vừa tạo thành công ở **Case 2.1** (đã có ngày sinh `20/05/1996`).

    *   **Case 3.1: Cập nhật không gửi trường ngày sinh (Bug 1 - Đã sửa)**:
        *   Gửi request `PUT /api/users/{id}` và chỉ gửi các thông tin muốn thay đổi, **bỏ hoàn toàn** trường `birthDate` ra khỏi payload:
            ```json
            {
              "fullName": "Kiểm Thử Viên 01 Cập Nhật",
              "email": "tester_new_01@gmail.com",
              "roleId": 3
            }
            ```
        *   **Kết quả mong đợi**: Trả về `200 OK`.
        *   **Kiểm chứng Database**: Mở Prisma Studio (`http://localhost:5555`) tại bảng **User**, tìm người dùng này. Kiểm tra trường `birthDate` (birth_date). Kỳ vọng: **Ngày sinh vẫn được giữ nguyên là 1996-05-20, không bị đè thành NULL**.

    *   **Case 3.2: Muốn xóa ngày sinh một cách chủ động**:
        *   Gửi request `PUT` truyền trực tiếp giá trị `null` cho trường `birthDate`:
            ```json
            {
              "fullName": "Kiểm Thử Viên 01 Xóa Ngày Sinh",
              "email": "tester_new_01@gmail.com",
              "roleId": 3,
              "birthDate": null
            }
            ```
        *   **Kết quả mong đợi**: Trả về `200 OK`. Kiểm tra database, ngày sinh của người dùng lúc này đã được cập nhật thành `NULL` thành công.

---

### 4. API KÍCH HOẠT / KHÓA TÀI KHOẢN (`PATCH /api/users/{id}/status`)
*   **Mục tiêu**: Kiểm tra lỗi crash body rỗng và ngăn chặn Admin tự khóa chính mình.
*   **Các trường hợp kiểm thử**:

    *   **Case 4.1: Gửi request body trống hoặc null (Bug 5 - Đã sửa)**:
        *   Gửi request `PATCH /api/users/{id}/status` với body là `{}` hoặc `{ "isActive": null }`.
        *   **Kết quả mong đợi**: Trả về `400 Bad Request` báo lỗi validate, không crash server lỗi 500 như trước.

    *   **Case 4.2: Admin tự khóa chính mình**:
        *   Nhập ID của tài khoản Admin hiện tại vào URL (ID thường là 1).
        *   Gửi request: `{ "isActive": false }`.
        *   **Kết quả mong đợi**: Hệ thống chặn lại và trả về `400 Bad Request` ("Bạn không thể tự khóa tài khoản của chính mình").

---

### 5. API XÓA NHIỀU NGƯỜI DÙNG CÙNG LÚC (`POST /api/users/bulk-delete`)
*   **Mục tiêu**: Kiểm tra an toàn bảo mật dữ liệu đầu vào.
*   **Các trường hợp kiểm thử**:

    *   **Case 5.1: Gửi request body trống `{}` (Bug 5 - Đã sửa)**:
        *   Gửi request `POST /api/users/bulk-delete` với body trống `{}`.
        *   **Kết quả mong đợi**: Hệ thống trả về `400 Bad Request` chỉ rõ thiếu mảng `ids` thay vì crash 500 lỗi logic.

    *   **Case 5.2: Gửi danh sách xóa chứa ID của chính Admin đang thao tác**:
        *   Gửi payload chứa ID của Admin:
            ```json
            {
              "ids": [1, 9999] 
            }
            ```
        *   **Kết quả mong đợi**: Trả về `201 Created` hoặc `400` tùy thuộc danh sách sau lọc. Hệ thống tự động lọc bỏ ID của Admin ra khỏi danh sách cần xóa để đảm bảo Admin không tự xóa chính mình.

---

### 6. API NHẬP CÁN BỘ TỪ EXCEL (`POST /api/users/import`)
*   **Mục tiêu**: Kiểm thử an toàn tải lên file Excel (DoS size limit) và hiệu năng check trùng lặp dữ liệu.
*   **Các trường hợp kiểm thử**:

    *   **Case 6.1: Tải lên file quá dung lượng cho phép (>5MB) (Bug 6 - Đã sửa)**:
        *   Mở API `POST /api/users/import` trên Swagger.
        *   Chọn một file bất kỳ có dung lượng > 5MB hoặc file không đúng định dạng `.xlsx` (ví dụ file `.png`, `.txt`).
        *   **Kết quả mong đợi**: NestJS chặn ngay ở bộ lọc `ParseFilePipe`, trả về `400 Bad Request` ("Dung lượng file không được vượt quá 5MB" hoặc lỗi định dạng file).

    *   **Case 6.2: Kiểm tra hiệu năng xử lý (Bug 8 - Đã sửa)**:
        *   Chuẩn bị file Excel mẫu chứa khoảng 100 dòng thông tin nhân viên mới.
        *   Tiến hành tải lên và bấm Execute.
        *   **Kết quả mong đợi**: Tải lên thành công tức thì (chỉ mất dưới 1 giây), API phản hồi kết quả đếm số dòng thành công hoặc danh sách chi tiết các dòng bị lỗi in-memory mà không làm tắc nghẽn Pool truy vấn của PostgreSQL.

---

### 7. API XUẤT CÁN BỘ RA EXCEL (`GET /api/users/export`)
*   **Mục tiêu**: Kiểm tra lỗi múi giờ ngày sinh (Timezone shift) trên file Excel.
*   **Cách test (Bug 7 - Đã sửa)**:
    *   Tạo một cán bộ mới qua Swagger có ngày sinh `20/05/1996` (trên máy local).
    *   Gọi API `GET /api/users/export` trên Swagger, nhấn **Execute** -> chọn **Download file** để tải file `danh_sach_nguoi_dung.xlsx` về máy.
    *   Mở file Excel vừa tải xuống bằng Microsoft Excel hoặc Google Sheets.
    *   Tìm bản ghi người dùng vừa tạo.
### 8. API TẢI LÊN ẢNH ĐẠI DIỆN CỦA CÁN BỘ NỘI BỘ (`POST /api/users/upload-avatar`)
*   **Mục tiêu**: Đảm bảo admin tải lên được ảnh đại diện (avatar) cho người dùng khác và nhận lại URL ảnh hợp lệ để điền vào `avatarUrl` trong API tạo/cập nhật người dùng (độc lập với avatar của admin).
*   **Các trường hợp kiểm thử**:
    *   **Case 8.1: Tải lên ảnh hợp lệ (Happy Path)**:
        *   Mở API `POST /api/users/upload-avatar` trên Swagger.
        *   Click **Try it out**, chọn file ảnh có định dạng `.png`, `.jpg`, `.jpeg`, `.gif` hoặc `.webp` có dung lượng dưới 5MB.
        *   Nhấn **Execute**.
        *   **Kết quả mong đợi**: Trả về `201 Created` kèm theo đường dẫn URL của file ảnh được lưu trên Supabase Storage dạng:
            ```json
            {
              "url": "https://<supabase-domain>/storage/v1/object/public/..."
            }
            ```
            *(Sao chép URL này để gán vào trường `avatarUrl` trong API Tạo mới hoặc Cập nhật cán bộ).*
    *   **Case 8.2: Tải lên file quá kích thước (> 5MB)**:
        *   Tải lên file lớn hơn 5MB.
        *   **Kết quả mong đợi**: Hệ thống chặn ngay tại ParseFilePipe, trả về `400 Bad Request` kèm thông báo lỗi kích thước vượt quá giới hạn 5MB.
    *   **Case 8.3: Tải lên file sai định dạng (không phải ảnh)**:
        *   Tải lên file `.txt` hoặc `.xlsx`.
        *   **Kết quả mong đợi**: Trả về `400 Bad Request` kèm thông báo lỗi định dạng file không hợp lệ (hỗ trợ image/jpeg, image/png, image/jpg, image/gif, image/webp).

---


## BƯỚC 4: CÁC CÂU LỆNH TRUY VẤN DATABASE TRỰC TIẾP ĐỂ KIỂM TRA TÍNH ĐÚNG ĐẮN

Bạn có thể mở công cụ quản lý cơ sở dữ liệu (DBeaver, pgAdmin) hoặc chạy qua công cụ dòng lệnh PostgreSQL để thực thi các câu lệnh truy vấn sau:

1. **Kiểm tra xem email của người dùng có thực sự được lưu nhất quán dạng chữ thường hay không (Bug 4)**:
   ```sql
   -- Truy vấn tìm tài khoản có ký tự in hoa trong email
   SELECT id, username, email FROM users WHERE email ~ '[A-Z]';
   ```
   *Kỳ vọng:* Kết quả trả về **0 bản ghi** (tất cả email của cán bộ nội bộ bắt buộc phải viết thường hoàn toàn).

2. **Kiểm tra xem có bất kỳ cán bộ nội bộ nào bị gán nhầm vai trò Doanh nghiệp (roleId = 4) mà không có Profile liên kết hay không (Bug 3)**:
   ```sql
   -- Tìm các user có vai trò Enterprise nhưng không có profile liên kết ở bảng enterprises
   SELECT u.id, u.username, u.email 
   FROM users u
   LEFT JOIN enterprises e ON u.id = e.user_id
   WHERE u.role_id = 4 AND e.id IS NULL;
   ```
   *Kỳ vọng:* Kết quả trả về **0 bản ghi** (nếu có bản ghi trả về chứng tỏ hệ thống đang bị rò rỉ Relation Gap).

3. **Kiểm tra định dạng ngày sinh của các cán bộ sau khi Import từ file Excel**:
   ```sql
   -- Xem danh sách ngày sinh của 10 cán bộ được tạo gần nhất
   SELECT id, username, birth_date FROM users ORDER BY created_at DESC LIMIT 10;
   ```
   *Kỳ vọng:* Ngày sinh hiển thị đúng dạng ngày `YYYY-MM-DD` tương ứng với lịch nhập từ file Excel, không bị lệch ngày do timezone.
