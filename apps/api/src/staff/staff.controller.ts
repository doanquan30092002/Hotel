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
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffEntity } from './entities/staff.entity';
import { StaffService } from './staff.service';

const STAFF_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Danh sách nhân viên (phân trang, lọc)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhân viên' })
  async findAll(@Query() query: QueryStaffDto) {
    return this.staffService.list(query);
  }

  @Get(':id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Chi tiết nhân viên' })
  @ApiResponse({ status: 200, description: 'Chi tiết nhân viên', type: StaffEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên' })
  async findOne(@Param('id') id: string): Promise<{ data: StaffEntity }> {
    const staff = await this.staffService.findOne(id);
    return { data: staff };
  }

  @Post()
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: StaffEntity })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateStaffDto): Promise<{ data: StaffEntity }> {
    const staff = await this.staffService.create(dto);
    return { data: staff };
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: StaffEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<{ data: StaffEntity }> {
    const staff = await this.staffService.update(id, dto);
    return { data: staff };
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm nhân viên' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhân viên' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.staffService.remove(id);
  }
}
