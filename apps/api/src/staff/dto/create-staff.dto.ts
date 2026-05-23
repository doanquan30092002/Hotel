import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ description: 'Họ và tên nhân viên' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên bắt buộc' })
  fullName!: string;

  @ApiPropertyOptional({ description: 'ID phòng ban (STAFF_DEPARTMENT)' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'ID chức vụ (STAFF_POSITION)' })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email nhân viên' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ enum: ['day', 'night', 'full'], description: 'Ca làm việc' })
  @IsOptional()
  @IsIn(['day', 'night', 'full'])
  shiftType?: 'day' | 'night' | 'full';

  @ApiProperty({ description: 'Ngày vào làm (ISO8601 date)', example: '2025-01-15' })
  @IsISO8601({ strict: true }, { message: 'joinDate phải đúng định dạng ngày' })
  joinDate!: string;

  @ApiProperty({ description: 'Lương cơ bản (VND)', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary!: number;

  @ApiPropertyOptional({ description: 'Phụ cấp (VND)', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  allowance?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'URL ảnh đại diện' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;
}
