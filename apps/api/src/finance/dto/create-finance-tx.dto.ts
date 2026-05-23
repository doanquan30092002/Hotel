import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FinanceTxType } from '@prisma/client';

export class CreateFinanceTxDto {
  @ApiProperty({ enum: FinanceTxType, description: 'Loại giao dịch: INCOME | EXPENSE' })
  @IsEnum(FinanceTxType)
  type!: FinanceTxType;

  @ApiProperty({ description: 'ID nhóm danh mục (FINANCE_GROUP)' })
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @ApiPropertyOptional({ description: 'ID booking liên kết (tuỳ chọn)' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'ID phương thức thanh toán (PAYMENT_METHOD, tuỳ chọn)' })
  @IsOptional()
  @IsString()
  methodId?: string;

  @ApiProperty({ description: 'Mô tả giao dịch' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Số tiền (VND)', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'Ngày xảy ra giao dịch (ISO8601 date)', example: '2026-05-20' })
  @IsISO8601({ strict: true })
  occurredAt!: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  note?: string;
}
