import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UpdateUserDto } from '../dto/user/update-user.dto';
import { QueryUserDto } from '../dto/user/query_user.dto';
import { UserRepository } from '../repositories/user.repository';
import { PrismaService } from '../repositories/prisma.service';
import * as XLSX from 'xlsx';
import { ConfirmImportUserDto, ImportUserItemDto } from '../dto/user/import-user.dto';
@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly prisma: PrismaService,
    ) { }


    private formatUserResponse(user: any) {
        if (!user) return null;
        const { passwordHash, ...result } = user;
        if (result.birthDate && result.birthDate instanceof Date) {
            result.birthDate = result.birthDate.toISOString().split('T')[0];
        }
        return result;
    }


    async getUser(query: QueryUserDto) {
        const users = await this.userRepository.findAll(query);
        const total = await this.userRepository.countAll(query);
        const limit = query.limit || 10;
        const page = query.page || 1;
        const formattedUsers = users.map(user => this.formatUserResponse(user));
        return {
            data: formattedUsers,
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

        const newUser = await this.userRepository.create({
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
        return this.formatUserResponse(newUser);
    }

    async getUserById(id: number) {
        const user = await this.userRepository.findUniqueById(id);
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        return this.formatUserResponse(user);
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

        const updateUser = await this.userRepository.update(userId, {
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
        return this.formatUserResponse(updateUser);
    }

    async updateStatus(userId: number, isActive: boolean) {
        const user = await this.userRepository.findUniqueById(userId);
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        const updatedUser = await this.userRepository.update(userId, { isActive });
        return this.formatUserResponse(updatedUser);
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

    async getRoles(search?: string) {
        return this.prisma.role.findMany({
            where: {
                isActive: true,
                code: { not: 'ENTERPRISE' },
                ...(search
                    ? {
                          OR: [
                              { name: { contains: search, mode: 'insensitive' } },
                              { code: { contains: search, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
            },
            select: {
                id: true,
                code: true,
                name: true,
                description: true
            }
        });
    }

    async getPositions(search?: string) {
        const users = await this.prisma.user.findMany({
            where: {
                position: { 
                    not: null, 
                    notIn: [''],
                    ...(search ? { contains: search, mode: 'insensitive' } : {})
                },
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

    private normalizeKey(key: string): string {
        return key.toLowerCase().replace(/\*/g, '').trim();
    }

    // -------------- excel--------------------------------
    // import
    async importPreview(file: Express.Multer.File) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Vui lòng chọn file tải lên');
        }

        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            
            // Đọc dưới dạng mảng 2 chiều để phát hiện dòng tiêu đề linh hoạt
            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

            if (rawRows.length === 0) {
                throw new BadRequestException('File Excel tải lên không có dữ liệu');
            }

            // Tìm kiếm dòng tiêu đề (chứa các từ khóa bắt buộc)
            let headerRowIndex = -1;
            for (let r = 0; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!row || !Array.isArray(row)) continue;

                const hasUsername = row.some(cell => {
                    const val = this.normalizeKey(String(cell || ''));
                    return ['tài khoản (tên đăng nhập)', 'tên đăng nhập', 'tài khoản', 'username', 'tai khoan', 'tài khoản (tên đăng nhân)'].includes(val);
                });
                const hasFullName = row.some(cell => {
                    const val = this.normalizeKey(String(cell || ''));
                    return ['họ và tên', 'họ tên', 'ho ten', 'fullname', 'ho va ten'].includes(val);
                });
                const hasEmail = row.some(cell => {
                    const val = this.normalizeKey(String(cell || ''));
                    return ['email', 'thư điện tử'].includes(val);
                });

                if (hasUsername && (hasFullName || hasEmail)) {
                    headerRowIndex = r;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                throw new BadRequestException('Không tìm thấy dòng tiêu đề hợp lệ trong file Excel. File cần chứa các cột bắt buộc: Tài khoản (Tên đăng nhập), Họ và tên, Email, Vai trò');
            }

            const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
            const rows: Record<string, any>[] = [];
            for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
                const rowData = rawRows[r];
                if (!rowData || rowData.length === 0 || rowData.every(val => val === null || val === undefined || val === '')) {
                    continue;
                }
                const rowObj: Record<string, any> = {};
                headers.forEach((header, colIndex) => {
                    if (header) {
                        rowObj[header] = rowData[colIndex] !== undefined ? rowData[colIndex] : null;
                    }
                });
                rowObj['__excel_row_number__'] = r + 1; // Số dòng thực tế trong Excel (1-indexed)
                rows.push(rowObj);
            }

            // Tải cache in-memory để kiểm tra trùng nhanh
            const existingUsers = await this.prisma.user.findMany({
                select: { username: true, email: true },
            });
            const existingUsernamesSet = new Set(existingUsers.map(u => u.username.toLowerCase()));
            const existingEmailsSet = new Set(existingUsers.filter(u => u.email).map(u => u.email!.toLowerCase()));

            const existingEnterprises = await this.prisma.enterprise.findMany({
                select: { email: true },
            });
            const existingEnterpriseEmailsSet = new Set(existingEnterprises.filter(e => e.email).map(e => e.email!.toLowerCase()));

            const roles = await this.prisma.role.findMany();

            let validCount = 0;
            let invalidCount = 0;
            const results: any[] = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowIndex = row['__excel_row_number__'];
                const rowErrors: string[] = [];

                // Ánh xạ linh hoạt tiêu đề cột từ file Excel
                const usernameKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['tài khoản (tên đăng nhập)', 'tên đăng nhập', 'tài khoản', 'username', 'tai khoan', 'tài khoản (tên đăng nhân)'].includes(norm);
                });
                const fullNameKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['họ và tên', 'họ tên', 'ho ten', 'fullname', 'ho va ten'].includes(norm);
                });
                const emailKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['email', 'thư điện tử'].includes(norm);
                });
                const roleKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['vai trò', 'vai tro', 'quyen', 'role'].includes(norm);
                });
                const positionKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['chức danh', 'chức vụ', 'chuc danh', 'chuc vu', 'position'].includes(norm);
                });
                const birthDateKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['ngày sinh', 'ngay sinh', 'birthdate'].includes(norm);
                });
                const genderKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['giới tính', 'gioi tinh', 'gender'].includes(norm);
                });
                const addressKey = Object.keys(row).find(k => {
                    const norm = this.normalizeKey(k);
                    return ['địa chỉ', 'dia chi', 'address'].includes(norm);
                });

                if (!usernameKey || !fullNameKey || !emailKey || !roleKey) {
                    rowErrors.push('Thiếu các cột bắt buộc: Tài khoản, Họ tên, Email, Vai trò');
                    invalidCount++;
                    results.push({
                        rowNumber: rowIndex,
                        isValid: false,
                        errors: rowErrors,
                        data: null,
                    });
                    continue;
                }

                const username = String(row[usernameKey] || '').trim().toLowerCase();
                const fullName = String(row[fullNameKey] || '').trim();
                const email = String(row[emailKey] || '').trim().toLowerCase();
                const roleName = String(row[roleKey] || '').trim();
                const position = positionKey ? String(row[positionKey] || '').trim() : null;
                const birthDateStr = birthDateKey ? String(row[birthDateKey] || '').trim() : null;
                const gender = genderKey ? String(row[genderKey] || '').trim() : null;
                const address = addressKey ? String(row[addressKey] || '').trim() : null;

                // Kiểm tra dữ liệu rỗng và độ dài tối đa
                if (!username) {
                    rowErrors.push('Tên đăng nhập không được để trống');
                } else {
                    if (username.length > 100) {
                        rowErrors.push('Tên đăng nhập tối đa 100 ký tự');
                    }
                    if (!/^[a-z0-9_]+$/.test(username)) {
                        rowErrors.push('Tên đăng nhập chỉ gồm chữ cái thường a-z, chữ số 0-9 và dấu gạch dưới _');
                    }
                }

                if (!fullName) {
                    rowErrors.push('Họ và tên không được để trống');
                } else if (fullName.length > 255) {
                    rowErrors.push('Họ và tên tối đa 255 ký tự');
                }

                if (!email) {
                    rowErrors.push('Email không được để trống');
                } else {
                    if (email.length > 255) {
                        rowErrors.push('Email tối đa 255 ký tự');
                    }
                    // Sử dụng regex định dạng email tiêu chuẩn
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        rowErrors.push(`Email "${email}" không đúng định dạng`);
                    }
                }

                // Đối chiếu vai trò
                let role: any = null;
                if (!roleName) {
                    rowErrors.push('Vai trò không được để trống');
                } else {
                    role = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
                    if (!role) {
                        rowErrors.push(`Không tìm thấy vai trò "${roleName}" trên hệ thống`);
                    } else if (role.code === 'ENTERPRISE') {
                        rowErrors.push('Không được phép tạo tài khoản có vai trò Doanh nghiệp ở bảng này');
                    }
                }

                // Kiểm tra trùng username trong Set cache
                if (username && existingUsernamesSet.has(username)) {
                    rowErrors.push(`Tên tài khoản "${username}" đã tồn tại`);
                }

                // Kiểm tra trùng email cán bộ
                if (email && existingEmailsSet.has(email)) {
                    rowErrors.push(`Email "${email}" đã được sử dụng bởi một tài khoản cán bộ khác`);
                }

                // Kiểm tra trùng email doanh nghiệp
                if (email && existingEnterpriseEmailsSet.has(email)) {
                    rowErrors.push(`Email "${email}" đã tồn tại trên phân hệ Doanh nghiệp`);
                }

                // Validate ngày sinh (không bắt buộc, nếu có phải đúng định dạng DD/MM/YYYY)
                let birthDate: Date | null = null;
                if (birthDateStr) {
                    const parts = birthDateStr.split('/');
                    if (parts.length !== 3) {
                        rowErrors.push('Ngày sinh không đúng định dạng DD/MM/YYYY');
                    } else {
                        const [day, month, year] = parts.map(Number);
                        birthDate = new Date(year, month - 1, day);
                        if (
                            isNaN(birthDate.getTime()) ||
                            birthDate.getFullYear() !== year ||
                            birthDate.getMonth() !== month - 1 ||
                            birthDate.getDate() !== day
                        ) {
                            rowErrors.push('Ngày sinh không đúng lịch hoặc sai định dạng DD/MM/YYYY');
                        } else {
                            const today = new Date();
                            today.setHours(23, 59, 59, 999);
                            if (birthDate > today) {
                                rowErrors.push('Ngày sinh không được vượt quá ngày hiện tại');
                            }
                        }
                    }
                }

                if (rowErrors.length > 0) {
                    invalidCount++;
                    results.push({
                        rowNumber: rowIndex,
                        isValid: false,
                        errors: rowErrors,
                        data: null,
                    });
                } else {
                    validCount++;

                    // Cập nhật bộ đệm Set để tránh trùng lặp giữa các dòng trong cùng file Excel
                    existingUsernamesSet.add(username);
                    existingEmailsSet.add(email);

                    // Lưu lại thông tin đã được format chuẩn hóa
                    results.push({
                        rowNumber: rowIndex,
                        isValid: true,
                        errors: [],
                        data: {
                            username,
                            fullName,
                            email,
                            roleId: role!.id,
                            position: position || undefined,
                            birthDate: birthDateStr || undefined, // Ngày sinh không bắt buộc
                            gender: gender || undefined,
                            address: address || undefined,
                        },
                    });
                }
            }

            return {
                totalRows: rows.length,
                validCount,
                invalidCount,
                results,
            };
        } catch (e: any) {
            throw new BadRequestException(`Lỗi khi xử lý file Excel: ${e.message}`);
        }
    }

    async importConfirm(dto: ConfirmImportUserDto) {
        if (!dto.users || dto.users.length === 0) {
            throw new BadRequestException('Danh sách xác nhận nhập rỗng');
        }

        const defaultPassword = '12345678';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        let successCount = 0;
        const errors: string[] = [];

        for (const u of dto.users) {
            try {
                const username = u.username.trim().toLowerCase();
                const email = u.email.trim().toLowerCase();

                // Kiểm tra trùng username DB lần cuối (concurrency safety)
                const dupUser = await this.userRepository.findUniqueByUsername(username);
                if (dupUser) {
                    errors.push(`Tài khoản "${username}" đã tồn tại trong DB trước khi được xác nhận.`);
                    continue;
                }

                // Kiểm tra trùng email DB lần cuối
                const dupEmail = await this.userRepository.findUniqueByEmail(email);
                const dupEntEmail = await this.prisma.enterprise.findUnique({ where: { email } });
                if (dupEmail || dupEntEmail) {
                    errors.push(`Email "${email}" đã tồn tại trong DB trước khi được xác nhận.`);
                    continue;
                }

                // Parse ngày sinh (ngày sinh không bắt buộc và đã được validate ở bước preview)
                let birthDate: Date | null = null;
                if (u.birthDate) {
                    const [day, month, year] = u.birthDate.split('/').map(Number);
                    birthDate = new Date(year, month - 1, day);
                }

                // Tiến hành lưu
                await this.userRepository.create({
                    username,
                    passwordHash,
                    fullName: u.fullName.trim(),
                    email,
                    role: { connect: { id: u.roleId } },
                    position: u.position ? u.position.trim() : null,
                    birthDate,
                    gender: u.gender ? u.gender.trim() : null,
                    address: u.address ? u.address.trim() : null,
                    isActive: true,
                });

                successCount++;
            } catch (e: any) {
                errors.push(`Lỗi khi tạo tài khoản "${u.username}": ${e.message}`);
            }
        }

        return {
            message: `Xác nhận lưu thành công ${successCount} cán bộ vào cơ sở dữ liệu`,
            importedCount: successCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
}