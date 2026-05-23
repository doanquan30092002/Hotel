import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryPackageDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo loại áp dụng (Standard | VillaVIP | Bungalow | Family | Deluxe)',
  })
  @IsOptional()
  @IsString({ message: 'applyType phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'applyType tối đa 100 ký tự' })
  applyType?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động (true/false)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã hoặc tên gói' })
  @IsOptional()
  @IsString({ message: 'Từ khoá tìm kiếm phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Từ khoá tối đa 200 ký tự' })
  keyword?: string;
}
