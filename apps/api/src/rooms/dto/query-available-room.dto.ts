import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class QueryAvailableRoomDto {
  @ApiProperty({ description: 'Ngày nhận phòng (YYYY-MM-DD)', example: '2026-06-01' })
  @IsISO8601({ strict: true }, { message: 'checkIn phải đúng định dạng ngày YYYY-MM-DD' })
  checkIn!: string;

  @ApiProperty({ description: 'Ngày trả phòng (YYYY-MM-DD)', example: '2026-06-03' })
  @IsISO8601({ strict: true }, { message: 'checkOut phải đúng định dạng ngày YYYY-MM-DD' })
  checkOut!: string;

  @ApiPropertyOptional({ description: 'Lọc theo loại phòng (typeId)' })
  @IsOptional()
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ description: 'Sức chứa tối thiểu', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Tìm theo mã hoặc tên phòng' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
