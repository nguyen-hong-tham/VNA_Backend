import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
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
import { BusinessFieldService } from '../services/business-field.service';
import { CreateBusinessFieldDto } from '../dto/create-business-field.dto';
import { UpdateBusinessFieldDto } from '../dto/update-business-field.dto';

@ApiTags('BusinessFields')
@Controller('business-fields')
export class BusinessFieldController {
  constructor(private businessFieldService: BusinessFieldService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách ngành nghề kinh doanh' })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Tìm theo mã ngành (chứa từ khóa)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Tìm theo tên ngành (chứa từ khóa)',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    description: 'Lọc theo cấp độ ngành (1, 2, 3, 4)',
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
    @Query('level') level?: string,
    @Query('status') status?: string,
  ) {
    let statusBool: boolean | undefined;
    if (status === 'true') statusBool = true;
    else if (status === 'false') statusBool = false;

    let levelNum: number | undefined;
    if (level) {
      levelNum = parseInt(level, 10);
    }

    return this.businessFieldService.findAll({
      code,
      name,
      level: levelNum,
      status: statusBool,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo mới ngành nghề kinh doanh' })
  @ApiResponse({ status: 201, description: 'Tạo mới thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Mã ngành đã tồn tại' })
  async create(@Body() dto: CreateBusinessFieldDto) {
    return this.businessFieldService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật ngành nghề kinh doanh' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ngành nghề kinh doanh',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessFieldDto,
  ) {
    return this.businessFieldService.update(id, dto);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Nhập danh sách ngành nghề kinh doanh từ file Excel/CSV',
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
            'File Excel (.xlsx, .xls) hoặc CSV chứa dữ liệu ngành nghề',
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
    return this.businessFieldService.importFromFile(file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa ngành nghề kinh doanh' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy ngành nghề kinh doanh',
  })
  @ApiResponse({
    status: 400,
    description:
      'Không thể xóa ngành nghề này vì đang có ngành nghề con hoặc doanh nghiệp tham chiếu đến',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.businessFieldService.delete(id);
  }
}
