import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUploadDto } from './dto/create-upload.dto';
import { QueryUploadDto } from './dto/query-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { UploadEntity } from './entities/upload.entity';
import { UploadsService } from './uploads.service';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST];
const MANAGER_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Danh sách tệp upload (phân trang, lọc)' })
  @ApiResponse({ status: 200, description: 'Danh sách tệp upload' })
  async findAll(@Query() query: QueryUploadDto) {
    return this.uploadsService.list(query);
  }

  // NOTE: /stats MUST be declared before /:id to avoid route collision
  @Get('stats')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Thống kê tệp upload theo loại' })
  @ApiResponse({ status: 200, description: 'Thống kê upload' })
  async getStats(): Promise<{ data: { total: number; byKind: Record<string, number> } }> {
    const stats = await this.uploadsService.getStats();
    return { data: stats };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Chi tiết tệp upload' })
  @ApiResponse({ status: 200, description: 'Chi tiết tệp upload', type: UploadEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tệp upload' })
  async findOne(@Param('id') id: string): Promise<{ data: UploadEntity }> {
    const upload = await this.uploadsService.findOne(id);
    return { data: upload };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Đăng ký tệp upload mới (URL đã biết từ storage)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: UploadEntity })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(
    @Body() dto: CreateUploadDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<{ data: UploadEntity }> {
    const upload = await this.uploadsService.create(dto, user.id);
    return { data: upload };
  }

  @Patch(':id')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Cập nhật metadata tệp upload' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: UploadEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tệp upload' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUploadDto,
  ): Promise<{ data: UploadEntity }> {
    const upload = await this.uploadsService.update(id, dto);
    return { data: upload };
  }

  @Delete(':id')
  @Roles(...MANAGER_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm tệp upload' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tệp upload' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.uploadsService.remove(id);
  }
}
