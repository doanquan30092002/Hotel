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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceEntity } from './entities/service.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({
    summary: 'Danh sách dịch vụ (phân trang, lọc theo nhóm / đơn vị / từ khoá)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách dịch vụ' })
  async findAll(@Query() query: QueryServiceDto) {
    return this.servicesService.list(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lấy thông tin một dịch vụ' })
  @ApiResponse({ status: 200, description: 'Thông tin dịch vụ', type: ServiceEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dịch vụ' })
  async findOne(@Param('id') id: string): Promise<{ data: ServiceEntity }> {
    const service = await this.servicesService.findOne(id);
    return { data: service };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo dịch vụ mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: ServiceEntity })
  @ApiResponse({ status: 409, description: 'Mã dịch vụ đã tồn tại' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateServiceDto): Promise<{ data: ServiceEntity }> {
    const service = await this.servicesService.create(dto);
    return { data: service };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật thông tin dịch vụ' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: ServiceEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dịch vụ' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<{ data: ServiceEntity }> {
    const service = await this.servicesService.update(id, dto);
    return { data: service };
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm dịch vụ' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy dịch vụ' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.servicesService.remove(id);
  }
}
