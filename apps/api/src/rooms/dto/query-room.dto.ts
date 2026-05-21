import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryRoomDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID loại phòng (ROOM_TYPE)' })
  @IsOptional()
  @IsString({ message: 'typeId phải là chuỗi ký tự' })
  typeId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID trạng thái phòng (ROOM_STATUS)' })
  @IsOptional()
  @IsString({ message: 'statusId phải là chuỗi ký tự' })
  statusId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID trạng thái dọn phòng (CLEANING_STATUS)' })
  @IsOptional()
  @IsString({ message: 'cleaningStatusId phải là chuỗi ký tự' })
  cleaningStatusId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID khu vực phòng (ROOM_AREA)' })
  @IsOptional()
  @IsString({ message: 'areaId phải là chuỗi ký tự' })
  areaId?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên hoặc mã phòng' })
  @IsOptional()
  @IsString({ message: 'Từ khoá tìm kiếm phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Từ khoá tối đa 200 ký tự' })
  keyword?: string;
}
