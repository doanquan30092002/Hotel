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

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BookingPaymentsQueryDto } from './dto/booking-payments-query.dto';
import { CreateFinanceTxDto } from './dto/create-finance-tx.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { QueryFinanceTxDto } from './dto/query-finance-tx.dto';
import { UpdateFinanceTxDto } from './dto/update-finance-tx.dto';
import { FinanceTxEntity } from './entities/finance-tx.entity';
import { FinanceService } from './finance.service';

const FINANCE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

interface CurrentUserPayload {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Thống kê thu chi tổng hợp theo khoảng thời gian' })
  @ApiResponse({ status: 200, description: 'Thống kê thu chi' })
  @ApiResponse({ status: 422, description: 'from >= to' })
  async getSummary(@Query() query: FinanceSummaryQueryDto) {
    return this.financeService.getSummary(query);
  }

  @Get('booking-payments')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Danh sách thanh toán booking gần đây' })
  @ApiResponse({ status: 200, description: 'Danh sách thanh toán' })
  async getBookingPayments(@Query() query: BookingPaymentsQueryDto) {
    return this.financeService.getBookingPayments(query);
  }

  @Get()
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Danh sách giao dịch thu chi (phân trang, lọc)' })
  @ApiResponse({ status: 200, description: 'Danh sách giao dịch' })
  async findAll(@Query() query: QueryFinanceTxDto) {
    return this.financeService.list(query);
  }

  @Get(':id')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Chi tiết giao dịch thu chi' })
  @ApiResponse({ status: 200, description: 'Chi tiết giao dịch', type: FinanceTxEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  async findOne(@Param('id') id: string): Promise<{ data: FinanceTxEntity }> {
    const tx = await this.financeService.findOne(id);
    return { data: tx };
  }

  @Post()
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Tạo giao dịch thu chi mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: FinanceTxEntity })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(
    @Body() dto: CreateFinanceTxDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ data: FinanceTxEntity }> {
    const tx = await this.financeService.create(dto, user.id);
    return { data: tx };
  }

  @Patch(':id')
  @Roles(...FINANCE_ROLES)
  @ApiOperation({ summary: 'Cập nhật giao dịch thu chi' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: FinanceTxEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceTxDto,
  ): Promise<{ data: FinanceTxEntity }> {
    const tx = await this.financeService.update(id, dto);
    return { data: tx };
  }

  @Delete(':id')
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm giao dịch thu chi' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.financeService.remove(id);
  }
}
