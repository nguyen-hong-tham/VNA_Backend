import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { QueryUserDto } from '../dto/user/query_user.dto';
import { UserRepository } from '../repositories/user.repository';
import { PrismaService } from '../repositories/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly prisma: PrismaService,
    ) { }

    async getUser(query: QueryUserDto) {
        const users = await this.userRepository.findAll(query);
        const total = await this.userRepository.countAll(query);
        const limit = query.limit || 10;
        const page = query.page || 1;
        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async createUser(dto: CreateUserDto) {
        const username = dto.username.toLowerCase().trim();
        const email = dto.email.toLowerCase().trim();

        // Chặn vai trò Enterprise (ID: 4 hoặc có code = 'ENTERPRISE')
        const role = await this.prisma.role.findUnique({
            where: { id: dto.roleId },
        });
        if (!role) {
            throw new NotFoundException(`Không tìm thấy vai trò với ID ${dto.roleId}`);
        }
        if (role.code === 'ENTERPRISE') {
            throw new BadRequestException('Không được phép gán vai trò Doanh nghiệp thông qua chức năng này');
        }

        // kiem tra trung username
        const existingUsername = await this.userRepository.findUniqueByUsername(username);
        if (existingUsername) {
            throw new ConflictException(`Tên đăng nhập ${username} đã tồn tại`);
        }

        // kiem tra trung email
        const existingEmail = await this.userRepository.findUniqueByEmail(email);
        if (existingEmail) {
            throw new ConflictException(`Email ${dto.email} đã tồn tại`);
        }

        // kiem tra trung email trong Enterprise
        const existingEnterprise = await this.prisma.enterprise.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
        });
        if (existingEnterprise) {
            throw new ConflictException('Email đã tồn tại');
        }

        // kiem tra ngay sinh hop le dd/mm/yy
        let birthDate: Date | null = null;
        if (dto.birthDate) {
            const [day, month, year] = dto.birthDate.split('/').map((part) => parseInt(part));
            birthDate = new Date(year, month - 1, day);

            if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
                throw new BadRequestException('Định dạng ngày sinh không chính xác');
            }

            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (birthDate > today) {
                throw new BadRequestException('Ngày sinh không được vượt quá ngày hiện tại');
            }
        }

        const defaultPassword = dto.password || '12345678';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        return this.userRepository.create({
            username,
            passwordHash,
            fullName: dto.fullName,
            email,
            role: { connect: { id: dto.roleId } },
            position: dto.position,
            birthDate: birthDate,
            gender: dto.gender,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            provinceId: dto.provinceId,
            wardId: dto.wardId,
            address: dto.address,
            avatarUrl: dto.avatarUrl,
        });
    }

    async getUserById(id: number) {
        const user = await this.userRepository.findUniqueById(id);
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        return user;
    }

    async updateUser(userId: number, dto: UpdateUserDto) {
        const user = await this.userRepository.findUniqueById(userId);
        if (!user) {
            throw new NotFoundException("Không tìm thấy người dùng");
        }

        const email = dto.email.toLowerCase().trim();

        // Chặn vai trò Enterprise (ID: 4 hoặc có code = 'ENTERPRISE')
        const role = await this.prisma.role.findUnique({
            where: { id: dto.roleId },
        });
        if (!role) {
            throw new NotFoundException(`Không tìm thấy vai trò với ID ${dto.roleId}`);
        }
        if (role.code === 'ENTERPRISE') {
            throw new BadRequestException('Không được phép gán vai trò Doanh nghiệp thông qua chức năng này');
        }

        // 1. Kiểm tra trùng email (chỉ báo lỗi khi email mới thuộc về người khác)
        const existingEmail = await this.userRepository.findUniqueByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
            throw new ConflictException('Email đã tồn tại');
        }

        // 2. Kiểm tra trùng email trong Enterprise (loại trừ enterprise liên kết của user này)
        const enterpriseIdToExclude = user.enterpriseProfile?.id;
        const existingEnterprise = await this.prisma.enterprise.findFirst({
            where: {
                email: { equals: email, mode: 'insensitive' },
                ...(enterpriseIdToExclude ? { id: { not: enterpriseIdToExclude } } : {}),
            },
        });
        if (existingEnterprise) {
            throw new ConflictException('Email đã tồn tại');
        }

        // 3. Sửa Bug 1: Xử lý birthDate để tránh data loss khi không truyền field
        let birthDate: Date | null | undefined = undefined; // Mặc định là undefined để Prisma giữ nguyên giá trị cũ
        if (dto.birthDate !== undefined) {
            if (dto.birthDate === null) {
                birthDate = null;
            } else {
                const [day, month, year] = dto.birthDate.split('/').map(Number);
                birthDate = new Date(year, month - 1, day);

                if (
                    birthDate.getFullYear() !== year ||
                    birthDate.getMonth() !== month - 1 ||
                    birthDate.getDate() !== day
                ) {
                    throw new BadRequestException('Ngày sinh không hợp lệ');
                }

                const today = new Date();
                today.setHours(23, 59, 59, 999);
                if (birthDate > today) {
                    throw new BadRequestException('Ngày sinh không được vượt quá ngày hiện tại');
                }
            }
        }

        return this.userRepository.update(userId, {
            fullName: dto.fullName,
            email,
            role: dto.roleId ? { connect: { id: dto.roleId } } : undefined,
            position: dto.position,
            birthDate: birthDate,
            gender: dto.gender,
            isActive: dto.isActive,
            provinceId: dto.provinceId,
            wardId: dto.wardId,
            address: dto.address,
            avatarUrl: dto.avatarUrl,
        });
    }

    async updateStatus(userId: number, isActive: boolean) {
        const user = await this.userRepository.findUniqueById(userId);
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        return this.userRepository.update(userId, { isActive });
    }

    async bulkDelete(ids: number[]) {
        try {
            return await this.prisma.user.deleteMany({
                where: {
                    id: { in: ids },
                },
            });
        } catch (e: any) {
            // Xử lý lỗi khóa ngoại DB trả về 400 thay vì sập 500
            if (e.code === 'P2003') {
                throw new BadRequestException('Không thể xóa người dùng do tài khoản đã có liên kết dữ liệu nghiệp vụ khác.');
            }
            throw e;
        }
    }

    async resetPassword(userId: number, newPassword: string) {
        const user = await this.userRepository.findUniqueById(userId);
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        return this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                tokenVersion: { increment: 1 },
            },
        });
    }

    async exportToExcel() {
        // Lấy tất cả người dùng nội bộ (không bao gồm role Doanh nghiệp)
        const users = await this.prisma.user.findMany({
            where: {
                role: {
                    code: { not: 'ENTERPRISE' }
                }
            },
            include: { role: true },
            orderBy: { createdAt: 'desc' },
        });

        // Định nghĩa các dòng tiêu đề và ánh xạ dữ liệu cột
        const worksheetData = users.map((user) => {
            // Sửa Bug 7: Format ngày sinh theo UTC để tránh timezone shift
            let birthDateStr = '';
            if (user.birthDate) {
                const d = new Date(user.birthDate);
                const day = String(d.getUTCDate()).padStart(2, '0');
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const year = d.getUTCFullYear();
                birthDateStr = `${day}/${month}/${year}`;
            }

            return {
                'Tài khoản (Tên đăng nhập)': user.username,
                'Họ và tên': user.fullName || '',
                'Email': user.email || '',
                'Vai trò': user.role?.name || '',
                'Chức danh': user.position || '',
                'Trạng thái': user.isActive ? 'Kích hoạt' : 'Khóa',
                'Ngày sinh': birthDateStr,
                'Giới tính': user.gender || '',
                'Địa chỉ': user.address || '',
            };
        });

        // Tạo file excel bằng thư viện xlsx
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách người dùng');

        // Xuất buffer dữ liệu
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }

    async importFromExcel(file: Express.Multer.File) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Vui lòng chọn file tải lên');
        }

        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

            if (rows.length === 0) {
                throw new BadRequestException('File Excel tải lên không có dữ liệu');
            }

            // Sửa Bug 8: Load dữ liệu in-memory để chống nghẽn N+1 queries DB
            const existingUsers = await this.prisma.user.findMany({
                select: { username: true, email: true },
            });
            const existingUsernamesSet = new Set(existingUsers.map(u => u.username.toLowerCase()));
            const existingEmailsSet = new Set(existingUsers.filter(u => u.email).map(u => u.email!.toLowerCase()));

            const existingEnterprises = await this.prisma.enterprise.findMany({
                select: { email: true },
            });
            const existingEnterpriseEmailsSet = new Set(existingEnterprises.filter(e => e.email).map(e => e.email!.toLowerCase()));

            let successCount = 0;
            const errors: string[] = [];
            const defaultPassword = '12345678';
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(defaultPassword, salt);

            // Cache danh sách Role có sẵn trong DB để tìm theo tên vai trò
            const roles = await this.prisma.role.findMany();

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowIndex = i + 2; // Số dòng thực tế trên file excel

                const username = String(row['Tài khoản (Tên đăng nhập)'] || '').trim().toLowerCase();
                const fullName = String(row['Họ và tên'] || '').trim();
                const email = String(row['Email'] || '').trim().toLowerCase();
                const roleName = String(row['Vai trò'] || '').trim();
                const position = String(row['Chức danh'] || '').trim();
                const birthDateStr = String(row['Ngày sinh'] || '').trim();
                const gender = String(row['Giới tính'] || '').trim();
                const address = String(row['Địa chỉ'] || '').trim();

                // Kiểm tra dữ liệu bắt buộc
                if (!username || !fullName || !email || !roleName) {
                    errors.push(`Dòng ${rowIndex}: Thiếu thông tin bắt buộc (Tài khoản, Họ tên, Email, Vai trò)`);
                    continue;
                }

                // Định dạng username
                if (!/^[a-z0-9_]+$/.test(username)) {
                    errors.push(`Dòng ${rowIndex}: Tài khoản "${username}" chứa ký tự không hợp lệ`);
                    continue;
                }

                // Đối chiếu vai trò
                const role = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
                if (!role) {
                    errors.push(`Dòng ${rowIndex}: Không tìm thấy vai trò "${roleName}" trên hệ thống`);
                    continue;
                }

                if (role.code === 'ENTERPRISE') {
                    errors.push(`Dòng ${rowIndex}: Không được phép tạo tài khoản Doanh nghiệp từ file này`);
                    continue;
                }

                // Kiểm tra trùng username in-memory
                if (existingUsernamesSet.has(username)) {
                    errors.push(`Dòng ${rowIndex}: Tài khoản "${username}" đã tồn tại`);
                    continue;
                }

                // Kiểm tra trùng email in-memory
                if (existingEmailsSet.has(email)) {
                    errors.push(`Dòng ${rowIndex}: Email "${email}" đã được sử dụng`);
                    continue;
                }

                // Kiểm tra trùng email trong Enterprise in-memory
                if (existingEnterpriseEmailsSet.has(email)) {
                    errors.push(`Dòng ${rowIndex}: Email "${email}" đã tồn tại trong danh sách doanh nghiệp`);
                    continue;
                }

                // Xử lý ngày sinh (định dạng DD/MM/YYYY)
                let birthDate: Date | null = null;
                if (birthDateStr) {
                    const [day, month, year] = birthDateStr.split('/').map(Number);
                    birthDate = new Date(year, month - 1, day);
                    if (
                        isNaN(birthDate.getTime()) ||
                        birthDate.getFullYear() !== year ||
                        birthDate.getMonth() !== month - 1 ||
                        birthDate.getDate() !== day
                    ) {
                        errors.push(`Dòng ${rowIndex}: Ngày sinh không đúng lịch hoặc sai định dạng DD/MM/YYYY`);
                        continue;
                    }
                }

                // Lưu user mới vào Database
                await this.userRepository.create({
                    username,
                    passwordHash,
                    fullName,
                    email,
                    role: { connect: { id: role.id } },
                    position,
                    birthDate,
                    gender,
                    isActive: true,
                    address,
                });

                // Cập nhật bộ đệm Set để tránh trùng lặp giữa các dòng trong cùng file Excel
                existingUsernamesSet.add(username);
                existingEmailsSet.add(email);

                successCount++;
            }

            return {
                message: `Đã nhập dữ liệu thành công ${successCount} cán bộ từ file Excel`,
                importedCount: successCount,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (e: any) {
            throw new BadRequestException(`Lỗi khi đọc file Excel: ${e.message}`);
        }
    }

    async getRoles() {
        return this.prisma.role.findMany({
            where: {
                isActive: true,
                code: { not: 'ENTERPRISE' }
            },
            select: {
                id: true,
                code: true,
                name: true,
                description: true
            }
        });
    }

    async getPositions() {
        const users = await this.prisma.user.findMany({
            where: {
                position: { not: null, notIn: [''] },
            },
            select: {
                position: true,
            },
            distinct: ['position'],
        });
        return users
            .map((u) => u.position?.trim())
            .filter((pos): pos is string => !!pos);
    }
}