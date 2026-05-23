import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'methodId bắt buộc' })
  methodId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'amount phải là số' })
  @Min(0, { message: 'amount không được âm' })
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'paidAt phải đúng định dạng ngày giờ' })
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
