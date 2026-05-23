import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHousekeepingTaskDto {
  @ApiProperty({ description: 'ID phòng' })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiPropertyOptional({ description: 'ID booking liên quan (tuỳ chọn)' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ description: 'ID trạng thái (Category nhóm HOUSEKEEPING_TASK_STATUS)' })
  @IsString()
  @IsNotEmpty()
  statusId!: string;

  @ApiPropertyOptional({ description: 'ID người được phân công (User)' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: ['high', 'normal', 'low'], default: 'normal' })
  @IsOptional()
  @IsIn(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';

  @ApiProperty({ description: 'Mô tả công việc' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Ngày lên lịch (YYYY-MM-DD)' })
  @IsISO8601({ strict: true })
  scheduledAt!: string;

  @ApiPropertyOptional({ description: 'Giờ bắt đầu (HH:mm)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Giờ kết thúc (HH:mm)' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  note?: string;
}
