import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryCategoriesDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: CategoryGroup, description: 'Lọc theo nhóm danh mục' })
  @IsOptional()
  @IsEnum(CategoryGroup, { message: 'Nhóm danh mục không hợp lệ' })
  group?: CategoryGroup;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'Giá trị active phải là true hoặc false' })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc mã' })
  @IsOptional()
  @IsString({ message: 'Từ khoá tìm kiếm phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Từ khoá tối đa 200 ký tự' })
  keyword?: string;
}
