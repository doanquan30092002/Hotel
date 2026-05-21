import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ enum: CategoryGroup, description: 'Nhóm danh mục' })
  @IsEnum(CategoryGroup, { message: 'Nhóm danh mục không hợp lệ' })
  group!: CategoryGroup;

  @ApiProperty({ example: 'single', description: 'Mã danh mục (chỉ chứa chữ, số, dấu gạch dưới)' })
  @IsString({ message: 'Mã danh mục phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9_]+$/i, { message: 'Mã danh mục chỉ được chứa chữ cái, số và dấu gạch dưới' })
  @MaxLength(64, { message: 'Mã danh mục tối đa 64 ký tự' })
  code!: string;

  @ApiProperty({ example: 'Phòng đơn', description: 'Tên hiển thị' })
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên danh mục không được để trống' })
  @MaxLength(200, { message: 'Tên danh mục tối đa 200 ký tự' })
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt({ message: 'Thứ tự sắp xếp phải là số nguyên' })
  @Min(0, { message: 'Thứ tự sắp xếp phải >= 0' })
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là true hoặc false' })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Thông tin bổ sung (JSON object tùy ý)' })
  @IsOptional()
  @IsObject({ message: 'Thông tin meta phải là đối tượng JSON' })
  meta?: Record<string, unknown>;
}
