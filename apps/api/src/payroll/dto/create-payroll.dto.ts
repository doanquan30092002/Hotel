import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollDto {
  @ApiProperty({ description: 'Tháng lương (YYYY-MM)', example: '2026-05' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month phải đúng định dạng YYYY-MM' })
  month!: string;

  @ApiProperty({ description: 'ID nhân viên' })
  @IsString()
  @IsNotEmpty({ message: 'staffId bắt buộc' })
  staffId!: string;

  @ApiProperty({ description: 'Số ngày công', minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  workingDays!: number;

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

  @ApiPropertyOptional({ description: 'Thưởng (VND)', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;

  @ApiPropertyOptional({ description: 'Phạt (VND)', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  penalty?: number;

  @ApiProperty({ description: 'ID trạng thái (PAYROLL_STATUS)' })
  @IsString()
  @IsNotEmpty()
  statusId!: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;
}
