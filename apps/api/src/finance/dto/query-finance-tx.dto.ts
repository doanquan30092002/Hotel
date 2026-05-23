import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { FinanceTxType } from '@prisma/client';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryFinanceTxDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: FinanceTxType, description: 'Lọc theo loại giao dịch' })
  @IsOptional()
  @IsEnum(FinanceTxType)
  type?: FinanceTxType;

  @ApiPropertyOptional({ description: 'Lọc theo nhóm danh mục (groupId)' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo booking' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo phương thức thanh toán' })
  @IsOptional()
  @IsString()
  methodId?: string;

  @ApiPropertyOptional({ description: 'Lọc từ ngày (ISO8601 date)', example: '2026-05-01' })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ description: 'Lọc đến ngày (ISO8601 date)', example: '2026-05-31' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã hoặc mô tả' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
