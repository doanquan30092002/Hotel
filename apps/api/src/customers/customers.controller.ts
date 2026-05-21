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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST];
const DELETE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Danh sách khách hàng (phân trang, lọc theo nguồn / từ khoá)' })
  @ApiResponse({ status: 200, description: 'Danh sách khách hàng' })
  async findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.list(query);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lấy thông tin một khách hàng' })
  @ApiResponse({ status: 200, description: 'Thông tin khách hàng', type: CustomerEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  async findOne(@Param('id') id: string): Promise<{ data: CustomerEntity }> {
    const customer = await this.customersService.findOne(id);
    return { data: customer };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo khách hàng mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: CustomerEntity })
  @ApiResponse({ status: 409, description: 'Mã / số điện thoại / CCCD đã tồn tại' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async create(@Body() dto: CreateCustomerDto): Promise<{ data: CustomerEntity }> {
    const customer = await this.customersService.create(dto);
    return { data: customer };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: CustomerEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  @ApiResponse({ status: 409, description: 'Mã / số điện thoại / CCCD đã tồn tại' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<{ data: CustomerEntity }> {
    const customer = await this.customersService.update(id, dto);
    return { data: customer };
  }

  @Delete(':id')
  @Roles(...DELETE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm khách hàng' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.customersService.remove(id);
  }
}
