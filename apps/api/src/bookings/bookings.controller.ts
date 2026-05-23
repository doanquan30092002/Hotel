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
import { BookingsService } from './bookings.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CheckInDto, CheckOutDto } from './dto/check-in-out.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingEntity } from './entities/booking.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST];
const DELETE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Danh sách booking (phân trang, lọc)' })
  @ApiResponse({ status: 200, description: 'Danh sách booking' })
  async findAll(@Query() query: QueryBookingDto) {
    return this.bookingsService.list(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Chi tiết booking (kèm items + payments)' })
  @ApiResponse({ status: 200, description: 'Chi tiết booking', type: BookingEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async findOne(@Param('id') id: string): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.findOne(id);
    return { data: booking };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo booking mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: BookingEntity })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Phòng đã được đặt' })
  @ApiResponse({ status: 422, description: 'checkOut phải sau checkIn' })
  async create(@Body() dto: CreateBookingDto): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.create(dto);
    return { data: booking };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật booking' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: BookingEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.update(id, dto);
    return { data: booking };
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Đổi trạng thái booking' })
  @ApiResponse({ status: 200, description: 'Đổi trạng thái thành công', type: BookingEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
  ): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.changeStatus(id, dto);
    return { data: booking };
  }

  @Delete(':id')
  @Roles(...DELETE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm booking' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.bookingsService.remove(id);
  }

  // ── Payments ────────────────────────────────────────────────────────────────

  @Post(':id/payments')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Thêm thanh toán cho booking' })
  @ApiResponse({ status: 201, description: 'Thêm thành công', type: BookingEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.addPayment(id, dto);
    return { data: booking };
  }

  @Delete(':bid/payments/:pid')
  @Roles(...DELETE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xoá mềm thanh toán' })
  @ApiResponse({ status: 200, description: 'Xoá thành công, trả về booking đã cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking / thanh toán' })
  async removePayment(
    @Param('bid') bid: string,
    @Param('pid') pid: string,
  ): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.removePayment(bid, pid);
    return { data: booking };
  }

  // ── Check-in / Check-out ────────────────────────────────────────────────────

  @Post(':id/check-in')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Check-in: ghi nhận giờ + chuyển trạng thái sang checked_in' })
  @ApiResponse({ status: 201, description: 'Check-in thành công', type: BookingEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
  ): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.checkIn(id, dto);
    return { data: booking };
  }

  @Post(':id/check-out')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Check-out: ghi nhận giờ + chuyển trạng thái sang checked_out' })
  @ApiResponse({ status: 201, description: 'Check-out thành công', type: BookingEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy booking' })
  async checkOut(
    @Param('id') id: string,
    @Body() dto: CheckOutDto,
  ): Promise<{ data: BookingEntity }> {
    const booking = await this.bookingsService.checkOut(id, dto);
    return { data: booking };
  }
}
