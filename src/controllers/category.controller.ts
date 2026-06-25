import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoryType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@ApiTags('Categories (Khai báo danh mục)')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'STAFF')
@ApiBearerAuth()
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  // GET /categories
  @Get()
  @ApiOperation({
    summary: '[Sở] Lấy danh sách danh mục',
    description:
      'Lấy danh sách nguyên nhân tai nạn, yếu tố gây chấn thương, nghề nghiệp, loại chấn thương. Có thể lọc theo type, mã, tên, trạng thái.',
  })
  @ApiQuery({
    name: 'type',
    enum: CategoryType,
    required: false,
    description: 'Loại danh mục',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Tìm theo mã (chứa từ khóa)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Tìm theo tên (chứa từ khóa)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Lọc trạng thái (true/false)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách danh mục' })
  findAll(
    @Query('type') type?: CategoryType,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('status') status?: string,
  ) {
    let statusBool: boolean | undefined;
    if (status === 'true') statusBool = true;
    else if (status === 'false') statusBool = false;

    return this.categoryService.findAll({
      type,
      code,
      name,
      status: statusBool,
    });
  }

  // GET /categories/export
  @Get('export')
  @ApiOperation({
    summary: '[Sở] Xuất danh mục ra file Excel',
    description:
      'Xuất danh sách danh mục ra file Excel. Hỗ trợ lọc giống API lấy danh sách.',
  })
  @ApiQuery({
    name: 'type',
    enum: CategoryType,
    required: false,
    description: 'Loại danh mục',
  })
  @ApiQuery({ name: 'code', required: false, description: 'Tìm theo mã' })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm theo tên' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Lọc trạng thái (true/false)',
  })
  @ApiResponse({ status: 200, description: 'File Excel danh mục' })
  async exportExcel(
    @Query('type') type?: CategoryType,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('status') status?: string,
    @Res() res?: import('express').Response,
  ) {
    let statusBool: boolean | undefined;
    if (status === 'true') statusBool = true;
    else if (status === 'false') statusBool = false;

    const { buffer, fileName } = await this.categoryService.exportExcel({
      type,
      code,
      name,
      status: statusBool,
    });

    res?.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res?.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    res?.send(buffer);
  }

  // GET /categories/:id
  @Get(':id')
  @ApiOperation({
    summary: '[Sở] Lấy chi tiết một danh mục (kèm danh mục cha và con)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết danh mục' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findById(id);
  }

  // POST /categories?type=INJURY_FACTOR
  @Post()
  @ApiOperation({ summary: '[Sở] Tạo mới danh mục' })
  @ApiQuery({
    name: 'type',
    enum: CategoryType,
    required: false,
    description:
      'Loại danh mục (nếu truyền qua query thì không cần truyền trong body)',
  })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({
    status: 409,
    description: 'Mã đã tồn tại trong loại danh mục này',
  })
  create(
    @Body() dto: CreateCategoryDto,
    @Query('type') typeFromQuery?: CategoryType,
  ) {
    // Query param ưu tiên hơn body (FE truyền khi đang ở tab danh mục nào đó)
    if (typeFromQuery) dto.type = typeFromQuery;
    return this.categoryService.create(dto);
  }

  // PATCH /categories/:id
  @Patch(':id')
  @ApiOperation({
    summary: '[Sở] Cập nhật danh mục (tên, cấp cha, trạng thái)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  // DELETE /categories/:id
  @Delete(':id')
  @ApiOperation({
    summary: '[Sở] Xóa danh mục (chỉ được xóa nếu không có dữ liệu tham chiếu)',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa vì đang có dữ liệu liên quan',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.delete(id);
  }

  // POST /categories/import
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '[Sở] Nhập danh mục từ file Excel/CSV',
    description: `Nhập hàng loạt danh mục từ file Excel hoặc CSV.
    
File phải có các cột (tên cột không phân biệt hoa thường):
- **type** / loại danh mục: ACCIDENT_CAUSE | INJURY_FACTOR | OCCUPATION | INJURY_TYPE
- **code** / mã: mã danh mục
- **name** / tên: tên danh mục
- **status** / trạng thái: (tùy chọn, mặc định "Sử dụng")
- **level** / cấp: (tùy chọn, mặc định 1)
- **parent_code** / mã cha: (tùy chọn, mã danh mục cha cùng loại)

Nếu mã đã tồn tại sẽ **cập nhật** (upsert), không tạo trùng.`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel (.xlsx, .xls) hoặc CSV',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Nhập dữ liệu thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  importFromFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024, // 5MB
            message: 'File không được vượt quá 5MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.categoryService.importFromFile(file);
  }
}
