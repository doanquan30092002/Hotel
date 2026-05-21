import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryCustomerDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID nguồn khách (GUEST_SOURCE)' })
  @IsOptional()
  @IsString({ message: 'sourceId phải là chuỗi ký tự' })
  sourceId?: string;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo họ tên, điện thoại, CCCD/hộ chiếu, email hoặc mã khách',
  })
  @IsOptional()
  @IsString({ message: 'Từ khoá tìm kiếm phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Từ khoá tối đa 200 ký tự' })
  keyword?: string;
}
