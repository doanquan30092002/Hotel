import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryServiceDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID nhóm dịch vụ (SERVICE_GROUP)' })
  @IsOptional()
  @IsString({ message: 'groupId phải là chuỗi ký tự' })
  groupId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID đơn vị tính (UNIT)' })
  @IsOptional()
  @IsString({ message: 'unitId phải là chuỗi ký tự' })
  unitId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động (true/false)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã hoặc tên dịch vụ' })
  @IsOptional()
  @IsString({ message: 'Từ khoá tìm kiếm phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Từ khoá tối đa 200 ký tự' })
  keyword?: string;
}
