# 🚀 Hướng dẫn chạy VNA Backend

## 📋 Mục lục
1. [Yêu cầu tiên quyết](#yêu-cầu-tiên-quyết)
2. [Setup lần đầu](#setup-lần-đầu)
3. [Cấu hình môi trường](#cấu-hình-môi-trường)
4. [Chạy Backend](#chạy-backend)
5. [Các lệnh hữu ích](#các-lệnh-hữu-ích)
6. [Troubleshooting](#troubleshooting)

---

## Yêu cầu tiên quyết

### Phần mềm cần cài
- **Node.js** ≥ 18.x (khuyến khích 20.x trở lên)
- **npm** ≥ 9.x (hoặc **yarn**)
- **PostgreSQL** (phiên bản 12+)
  - Cách 1: Cài local
  - Cách 2: Dùng Docker
  - Cách 3: Dùng Supabase cloud

### Kiểm tra cài đặt
```bash
node --version    # v18.x.x trở lên
npm --version     # 9.x.x trở lên
```

---

## Setup lần đầu

### 1️⃣ Clone project (nếu chưa có)
```bash
cd /path/to/project
# Hoặc nếu đã có folder thì vào folder đó
cd VNA_Backend
```

### 2️⃣ Cài đặt dependencies
```bash
npm install
# Hoặc nếu dùng yarn
yarn install
```

> ⚠️ Lần đầu cài sẽ mất khoảng 3-5 phút, cần kết nối internet ổn định.

### 3️⃣ Generate Prisma Client
```bash
npx prisma generate
```

> **Quan trọng:** Phải chạy lệnh này sau khi chỉnh sửa `schema.prisma` hoặc lần đầu setup.

---

## Cấu hình môi trường

### 1️⃣ Tạo file `.env`
Sao chép từ `.env.example`:
```bash
cp .env.example .env
```

### 2️⃣ Cấu hình DATABASE

#### 🐘 Cách 1: PostgreSQL Local (Docker - Khuyến khích để dev)
```bash
# Tạo container PostgreSQL
docker run --name vna_postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=vna_db \
  -p 5432:5432 \
  -d postgres:15

# Hoặc nếu dùng docker-compose, tạo file docker-compose.yml:
```
**Nội dung docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: vna_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: vna_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Chạy:
```bash
docker-compose up -d
```

Sau đó cập nhật `.env`:
```
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/vna_db?schema=public"
```

#### ☁️ Cách 2: Supabase Cloud
1. Truy cập [Supabase Dashboard](https://supabase.com/)
2. Tạo project mới
3. Vào **Project Settings > Database > Connection string**
4. Sao chép **Connection string (Transaction Pooler)** (port 6543)
5. Cập nhật `.env`:
```
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

#### 🔐 Cách 3: PostgreSQL Local (Cài trực tiếp)
Sửa `.env` thành URL PostgreSQL của bạn:
```
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public"
```

### 3️⃣ Cấu hình JWT
Sửa các giá trị trong `.env`:
```
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_change_in_production
JWT_REFRESH_EXPIRES_IN=7d
```

### 4️⃣ Cấu hình SMTP (Email)
Nếu muốn gửi email, sửa `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM='"VNA App" <your_email@gmail.com>'
```

> 📝 **Gmail App Password:** Không phải mật khẩu thường, xem hướng dẫn: https://support.google.com/accounts/answer/185833

### 5️⃣ Khác
```
PORT=3000                                    # Port chạy backend
NODE_ENV=development                         # development / production
FRONTEND_URL=http://localhost:4000          # URL frontend (CORS)
```

---

## Chạy Backend

### ✅ Chạy lần đầu - Tạo migration & seed dữ liệu

```bash
# 1. Tạo migration từ schema.prisma
npx prisma migrate dev --name init

# 2. Mở Prisma Studio (GUI quản lý DB) - tùy chọn
npx prisma studio

# 3. Start backend
npm run start:dev
```

### 🟢 Chế độ Development (Khuyến khích)
```bash
npm run start:dev
```
- **Tự động reload** khi sửa code
- Dễ debug
- Output đầy đủ

**Output khi thành công:**
```
[Nest] 12345   - 06/03/2026, 10:30:45 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345   - 06/03/2026, 10:30:45 AM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345   - 06/03/2026, 10:30:45 AM     LOG [RoutesResolver] AppController {/}: GET /...
[Nest] 12345   - 06/03/2026, 10:30:45 AM     LOG [NestApplication] Nest application successfully started on port 3000
```

### 🐛 Chế độ Debug
```bash
npm run start:debug
```
- Port 9229 để connect debugger
- Dùng VS Code debugger hoặc Chrome DevTools

### 📦 Chế độ Production
```bash
# 1. Build project
npm run build

# 2. Chạy production
npm run start:prod
```

---

## Các lệnh hữu ích

### 📊 Prisma
```bash
# Generate Prisma Client (chạy sau khi sửa schema.prisma)
npx prisma generate

# Xem GUI quản lý database
npx prisma studio

# Tạo migration mới (development)
npx prisma migrate dev --name your_migration_name

# Apply migration trên production
npx prisma migrate deploy

# Đẩy schema lên DB (không tạo migration)
npx prisma db push

# Reset database (cẩn thận - xóa toàn bộ dữ liệu!)
npx prisma migrate reset
```

### 🧪 Testing
```bash
# Chạy unit tests
npm run test

# Chạy tests theo watch mode
npm run test:watch

# Chạy e2e tests
npm run test:e2e

# Xem coverage
npm run test:cov
```

### 🎨 Code Quality
```bash
# Format code (Prettier)
npm run format

# Fix linting issues (ESLint)
npm run lint
```

### 📚 API Documentation
Backend chạy thành công:
- **Swagger UI:** http://localhost:3000/api/docs

---

## Troubleshooting

### ❌ Lỗi: `Cannot find module '@prisma/client'`
**Giải pháp:**
```bash
npx prisma generate
npm install
```

### ❌ Lỗi: Database connection error
**Kiểm tra:**
1. PostgreSQL có chạy không?
   ```bash
   # Nếu dùng Docker
   docker ps
   # Hoặc nếu local
   psql -U postgres
   ```
2. Biến `DATABASE_URL` trong `.env` đúng không?
3. Username/password/host/port đúng không?

### ❌ Lỗi: `Port 3000 already in use`
**Giải pháp (Windows):**
```bash
# Tìm process dùng port 3000
netstat -ano | findstr :3000

# Kill process (thay PID bằng số thực)
taskkill /PID <PID> /F

# Hoặc đổi port trong .env
PORT=3001
```

**Giải pháp (Mac/Linux):**
```bash
# Tìm process
lsof -i :3000

# Kill process (thay PID bằng số thực)
kill -9 <PID>
```

### ❌ Lỗi: `npm run start:dev` không auto-reload
**Giải pháp:**
- Chắc chắn dùng `npm run start:dev` chứ không phải `npm start`
- Restart terminal
- Xóa thư mục `dist/` và chạy lại:
  ```bash
  rm -rf dist node_modules
  npm install
  npm run start:dev
  ```

### ❌ Lỗi: SMTP không gửi email
**Kiểm tra:**
1. Biến SMTP trong `.env` đúng không?
2. Gmail App Password (không phải mật khẩu thường)?
3. [Bật "Less secure app access"](https://myaccount.google.com/lesssecureapps) hoặc dùng 2FA + App Password

### ❌ Lỗi: `Cannot find executable node_modules/.bin/jest`
**Giải pháp:**
```bash
rm -rf node_modules
npm install
npm run test
```

### ✅ Kiểm tra Backend chạy bình thường
Mở browser truy cập:
- http://localhost:3000/api/docs (Swagger)
- http://localhost:3000 (API root)

---

## 📌 Quy trình Setup hoàn chỉnh (từ đầu)

```bash
# 1. Clone/vào project
cd VNA_Backend

# 2. Cài dependencies
npm install

# 3. Setup PostgreSQL (nếu chưa có)
docker run --name vna_postgres -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=vna_db -p 5432:5432 -d postgres:15

# 4. Tạo .env từ .env.example
cp .env.example .env

# 5. Sửa .env (DATABASE_URL, JWT, SMTP...)

# 6. Generate Prisma
npx prisma generate

# 7. Tạo migration
npx prisma migrate dev --name init

# 8. Chạy backend
npm run start:dev

# 9. Truy cập API
# http://localhost:3000/api/docs
```

---

## 💡 Tips
- Lúc develop, dùng `npm run start:dev` (auto reload)
- Lúc debug, dùng VS Code Debugger + `npm run start:debug`
- Setup PostgreSQL qua Docker dễ nhất (không cần cài local)
- Luôn backup `.env` trước khi push lên git
- `.env` không được commit lên git (thêm vào `.gitignore`)

---

**Nếu gặp vấn đề, kiểm tra:** 
1. Tất cả dependencies đã cài chưa? (`npm install`)
2. Database URL đúng không? (test kết nối: `psql -U postgres`)
3. Prisma Client đã generate chưa? (`npx prisma generate`)
4. Port 3000 đã được dùng chưa? (thay sang port khác)

Happy coding! 🎉
