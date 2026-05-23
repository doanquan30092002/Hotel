import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePayrollDto {
  @ApiProperty({ description: 'Tháng lương (YYYY-MM)', example: '2026-05' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month phải đúng định dạng YYYY-MM' })
  month!: string;

  @ApiPropertyOptional({ description: 'Số ngày công (mặc định 28)', minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  workingDays?: number;
}
