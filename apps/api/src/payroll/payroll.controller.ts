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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { UserRole } from '@prisma/client';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChangePayrollStatusDto } from './dto/change-status.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollEntity } from './entities/payroll.entity';
import { PayrollService } from './payroll.service';

const PAYROLL_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Danh sách bảng lương (phân trang, lọc)' })
  @ApiResponse({ status: 200, description: 'Danh sách bảng lương' })
  async findAll(@Query() query: QueryPayrollDto) {
    return this.payrollService.list(query);
  }

  @Get('export')
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Xuất bảng lương ra XLSX (tôn trọng bộ lọc)' })
  @ApiResponse({ status: 200, description: 'File XLSX' })
  async exportXlsx(
    @Query() query: QueryPayrollDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.payrollService.generateXlsx(query);
    const monthPart = query.month ?? 'tat-ca';
    const filename = `bang-luong-${monthPart}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get(':id')
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Chi tiết bảng lương' })
  @ApiResponse({ status: 200, description: 'Chi tiết bảng lương', type: PayrollEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bảng lương' })
  async findOne(@Param('id') id: string): Promise<{ data: PayrollEntity }> {
    const payroll = await this.payrollService.findOne(id);
    return { data: payroll };
  }

  @Post('generate')
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Tạo bảng lương hàng loạt cho tháng' })
  @ApiResponse({ status: 201, description: 'Kết quả tạo hàng loạt' })
  async generate(
    @Body() dto: GeneratePayrollDto,
  ): Promise<{ data: { created: number; skipped: number } }> {
    const result = await this.payrollService.generate(dto);
    return { data: result };
  }

  @Post()
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Tạo bảng lương mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: PayrollEntity })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Đã có bảng lương của nhân sự này trong tháng' })
  async create(@Body() dto: CreatePayrollDto): Promise<{ data: PayrollEntity }> {
    const payroll = await this.payrollService.create(dto);
    return { data: payroll };
  }

  @Patch(':id/status')
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Đổi trạng thái bảng lương' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công', type: PayrollEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bảng lương' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangePayrollStatusDto,
  ): Promise<{ data: PayrollEntity }> {
    const payroll = await this.payrollService.changeStatus(id, dto);
    return { data: payroll };
  }

  @Patch(':id')
  @Roles(...PAYROLL_ROLES)
  @ApiOperation({ summary: 'Cập nhật bảng lương' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: PayrollEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bảng lương' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollDto,
  ): Promise<{ data: PayrollEntity }> {
    const payroll = await this.payrollService.update(id, dto);
    return { data: payroll };
  }

  @Delete(':id')
  @Roles(...PAYROLL_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm bảng lương' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bảng lương' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.payrollService.remove(id);
  }
}
