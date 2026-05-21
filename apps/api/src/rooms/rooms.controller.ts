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
import { ChangeCleaningDto } from './dto/change-cleaning.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomEntity } from './entities/room.entity';
import { RoomsService } from './rooms.service';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Danh sách phòng (phân trang, lọc theo loại / trạng thái / khu vực)' })
  @ApiResponse({ status: 200, description: 'Danh sách phòng' })
  async findAll(@Query() query: QueryRoomDto) {
    return this.roomsService.list(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lấy thông tin một phòng' })
  @ApiResponse({ status: 200, description: 'Thông tin phòng', type: RoomEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  async findOne(@Param('id') id: string): Promise<{ data: RoomEntity }> {
    const room = await this.roomsService.findOne(id);
    return { data: room };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo phòng mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: RoomEntity })
  @ApiResponse({ status: 409, description: 'Mã phòng đã tồn tại' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateRoomDto): Promise<{ data: RoomEntity }> {
    const room = await this.roomsService.create(dto);
    return { data: room };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật thông tin phòng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: RoomEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  @ApiResponse({ status: 409, description: 'Mã phòng đã tồn tại' })
  async update(@Param('id') id: string, @Body() dto: UpdateRoomDto): Promise<{ data: RoomEntity }> {
    const room = await this.roomsService.update(id, dto);
    return { data: room };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Đổi trạng thái phòng' })
  @ApiResponse({ status: 200, description: 'Đổi trạng thái thành công', type: RoomEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  @ApiResponse({ status: 400, description: 'statusId không hợp lệ' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ): Promise<{ data: RoomEntity }> {
    const room = await this.roomsService.changeStatus(id, dto);
    return { data: room };
  }

  @Patch(':id/cleaning')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPING)
  @ApiOperation({ summary: 'Đổi trạng thái dọn phòng' })
  @ApiResponse({
    status: 200,
    description: 'Đổi trạng thái dọn phòng thành công',
    type: RoomEntity,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  @ApiResponse({ status: 400, description: 'cleaningStatusId không hợp lệ' })
  async changeCleaning(
    @Param('id') id: string,
    @Body() dto: ChangeCleaningDto,
  ): Promise<{ data: RoomEntity }> {
    const room = await this.roomsService.changeCleaning(id, dto);
    return { data: room };
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm phòng' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy phòng' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.roomsService.remove(id);
  }
}
