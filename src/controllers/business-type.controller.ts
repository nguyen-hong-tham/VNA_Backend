import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  ParseIntPipe,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BusinessTypeService } from '../services/business-type.service';
import { CreateBusinessTypeDto } from '../dto/create-business-type.dto';
import { UpdateBusinessTypeDto } from '../dto/update-business-type.dto';

@ApiTags('BusinessTypes')
@Controller('business-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessTypeController {
  constructor(private businessTypeService: BusinessTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách loại hình kinh doanh' })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Tìm theo mã loại hình (chứa từ khóa)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Tìm theo tên loại hình (chứa từ khóa)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Lọc theo trạng thái hoạt động (true/false)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('status') status?: string,
  ) {
    let statusBool: boolean | undefined;
    if (status === 'true') statusBool = true;
    else if (status === 'false') statusBool = false;

    return this.businessTypeService.findAll({ code, name, status: statusBool });
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mới loại hình kinh doanh' })
  @ApiResponse({ status: 201, description: 'Tạo mới thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Mã loại hình đã tồn tại' })
  async create(@Body() dto: CreateBusinessTypeDto) {
    return this.businessTypeService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật loại hình kinh doanh' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy loại hình kinh doanh',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessTypeDto,
  ) {
    return this.businessTypeService.update(id, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Nhập danh sách loại hình kinh doanh từ file Excel/CSV',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'File Excel (.xlsx, .xls) hoặc CSV chứa dữ liệu loại hình kinh doanh',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Nhập dữ liệu thành công' })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ hoặc lỗi phân tích dữ liệu',
  })
  async importFromFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024, // 5MB
            message: 'Dung lượng file import không được vượt quá 5MB',
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.businessTypeService.importFromFile(file);
  }
}
