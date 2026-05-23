import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryStaffDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo chức vụ (positionId)' })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động (true/false)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  active?: boolean;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên, mã, phone, email' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
