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
import { AssignDto } from './dto/assign.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { QueryHousekeepingTaskDto } from './dto/query-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import { HousekeepingTaskEntity } from './entities/housekeeping-task.entity';
import { HousekeepingService } from './housekeeping.service';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
  UserRole.HOUSEKEEPING,
];
const HK_WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING];
const ASSIGN_ROLES = [UserRole.ADMIN, UserRole.MANAGER];
const DELETE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('housekeeping')
@ApiBearerAuth()
@Controller('housekeeping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Danh sách công việc dọn phòng (phân trang, lọc)' })
  @ApiResponse({ status: 200, description: 'Danh sách công việc' })
  async findAll(@Query() query: QueryHousekeepingTaskDto) {
    return this.housekeepingService.list(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Chi tiết công việc dọn phòng' })
  @ApiResponse({ status: 200, description: 'Chi tiết công việc', type: HousekeepingTaskEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async findOne(@Param('id') id: string): Promise<{ data: HousekeepingTaskEntity }> {
    const task = await this.housekeepingService.findOne(id);
    return { data: task };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo công việc dọn phòng mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: HousekeepingTaskEntity })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateHousekeepingTaskDto): Promise<{ data: HousekeepingTaskEntity }> {
    const task = await this.housekeepingService.create(dto);
    return { data: task };
  }

  @Patch(':id')
  @Roles(...HK_WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật công việc dọn phòng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: HousekeepingTaskEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHousekeepingTaskDto,
  ): Promise<{ data: HousekeepingTaskEntity }> {
    const task = await this.housekeepingService.update(id, dto);
    return { data: task };
  }

  @Patch(':id/status')
  @Roles(...HK_WRITE_ROLES)
  @ApiOperation({ summary: 'Đổi trạng thái công việc' })
  @ApiResponse({
    status: 200,
    description: 'Đổi trạng thái thành công',
    type: HousekeepingTaskEntity,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ): Promise<{ data: HousekeepingTaskEntity }> {
    const task = await this.housekeepingService.changeStatus(id, dto);
    return { data: task };
  }

  @Patch(':id/assign')
  @Roles(...ASSIGN_ROLES)
  @ApiOperation({ summary: 'Phân công / huỷ phân công người dọn phòng' })
  @ApiResponse({
    status: 200,
    description: 'Phân công thành công',
    type: HousekeepingTaskEntity,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignDto,
  ): Promise<{ data: HousekeepingTaskEntity }> {
    const task = await this.housekeepingService.assign(id, dto);
    return { data: task };
  }

  @Delete(':id')
  @Roles(...DELETE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm công việc dọn phòng' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy công việc' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.housekeepingService.remove(id);
  }
}
