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

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { QueryPackageDto } from './dto/query-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackageEntity } from './entities/package.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('packages')
@ApiBearerAuth()
@Controller('packages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Danh sách gói mẫu (phân trang, lọc theo loại / trạng thái / từ khoá)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách gói mẫu' })
  async findAll(@Query() query: QueryPackageDto) {
    return this.packagesService.list(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lấy thông tin một gói mẫu' })
  @ApiResponse({ status: 200, description: 'Thông tin gói mẫu', type: PackageEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói mẫu' })
  async findOne(@Param('id') id: string): Promise<{ data: PackageEntity }> {
    const pkg = await this.packagesService.findOne(id);
    return { data: pkg };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo gói mẫu mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: PackageEntity })
  @ApiResponse({ status: 409, description: 'Mã gói mẫu đã tồn tại' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 422, description: 'validTo phải >= validFrom' })
  async create(@Body() dto: CreatePackageDto): Promise<{ data: PackageEntity }> {
    const pkg = await this.packagesService.create(dto);
    return { data: pkg };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật thông tin gói mẫu' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: PackageEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói mẫu' })
  @ApiResponse({ status: 422, description: 'validTo phải >= validFrom' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePackageDto,
  ): Promise<{ data: PackageEntity }> {
    const pkg = await this.packagesService.update(id, dto);
    return { data: pkg };
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm gói mẫu' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gói mẫu' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.packagesService.remove(id);
  }
}
