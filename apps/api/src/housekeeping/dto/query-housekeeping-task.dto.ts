import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryHousekeepingTaskDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo phòng' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái' })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo người được phân công' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: ['high', 'normal', 'low'], description: 'Lọc theo độ ưu tiên' })
  @IsOptional()
  @IsIn(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';

  @ApiPropertyOptional({ description: 'Ngày lịch từ (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Ngày lịch đến (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã hoặc mô tả' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
