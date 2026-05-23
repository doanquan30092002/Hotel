import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryBookingDto extends PageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({}, { message: 'from phải đúng định dạng ngày' })
  from?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString({}, { message: 'to phải đúng định dạng ngày' })
  to?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã booking, tên / SĐT / CCCD khách' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
