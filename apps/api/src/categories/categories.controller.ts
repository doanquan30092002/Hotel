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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { ReorderDto } from './dto/reorder.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];
const WRITE_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Danh sách danh mục (phân trang, lọc theo nhóm / từ khoá)' })
  @ApiResponse({ status: 200, description: 'Danh sách danh mục' })
  async findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.list(query);
  }

  @Get('group-counts')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Đếm số danh mục theo nhóm (total + active)' })
  @ApiResponse({ status: 200, description: 'Số lượng theo nhóm' })
  async groupCounts() {
    return this.categoriesService.groupCounts();
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lấy thông tin một danh mục' })
  @ApiResponse({ status: 200, description: 'Thông tin danh mục', type: CategoryEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async findOne(@Param('id') id: string): Promise<{ data: CategoryEntity }> {
    const category = await this.categoriesService.findOne(id);
    return { data: category };
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công', type: CategoryEntity })
  @ApiResponse({ status: 409, description: 'Mã danh mục đã tồn tại trong nhóm' })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('id') userId: string,
  ): Promise<{ data: CategoryEntity }> {
    const category = await this.categoriesService.create(dto, userId);
    return { data: category };
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công', type: CategoryEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  @ApiResponse({ status: 422, description: 'Không thể đổi nhóm danh mục' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<{ data: CategoryEntity }> {
    const category = await this.categoriesService.update(id, dto);
    return { data: category };
  }

  @Patch(':id/toggle-active')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Bật / tắt trạng thái hoạt động của danh mục' })
  @ApiResponse({ status: 200, description: 'Đã chuyển trạng thái', type: CategoryEntity })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async toggleActive(@Param('id') id: string): Promise<{ data: CategoryEntity }> {
    const category = await this.categoriesService.toggleActive(id);
    return { data: category };
  }

  @Put('reorder')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự danh mục trong một nhóm' })
  @ApiResponse({
    status: 200,
    description: 'Đã sắp xếp lại',
    schema: { example: { data: { affected: 5 } } },
  })
  async reorder(@Body() dto: ReorderDto) {
    return this.categoriesService.reorder(dto.group, dto.orderedIds);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá mềm danh mục' })
  @ApiResponse({ status: 204, description: 'Xoá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }
}
