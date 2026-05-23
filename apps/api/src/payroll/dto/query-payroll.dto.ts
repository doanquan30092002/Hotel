import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryPayrollDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo nhân viên (staffId)' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái (statusId)' })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo tháng (YYYY-MM)', example: '2026-05' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month phải đúng định dạng YYYY-MM' })
  month?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã hoặc tên nhân viên' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
