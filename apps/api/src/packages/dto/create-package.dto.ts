import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({ example: 'GOI001', description: 'Mã gói (chỉ chứa chữ, số, gạch dưới)' })
  @IsString({ message: 'Mã gói phải là chuỗi ký tự' })
  @Matches(/^[a-z0-9_]+$/i, {
    message: 'Mã gói chỉ được chứa chữ cái, số và dấu gạch dưới',
  })
  @MaxLength(64, { message: 'Mã gói tối đa 64 ký tự' })
  code!: string;

  @ApiProperty({ example: 'Combo dôi 24/06', description: 'Tên gói' })
  @IsString({ message: 'Tên gói phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên gói không được để trống' })
  @MaxLength(200, { message: 'Tên gói tối đa 200 ký tự' })
  name!: string;

  @ApiProperty({
    example: 'Deluxe',
    description: 'Loại áp dụng (Standard | VillaVIP | Bungalow | Family | Deluxe)',
  })
  @IsString({ message: 'applyType phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'applyType tối đa 100 ký tự' })
  applyType!: string;

  @ApiProperty({ example: 1, description: 'Số đêm (>= 1)' })
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt({ message: 'Số đêm phải là số nguyên' })
  @Min(1, { message: 'Số đêm phải >= 1' })
  numNights!: number;

  @ApiProperty({ example: 2, description: 'Số khách (>= 1)' })
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt({ message: 'Số khách phải là số nguyên' })
  @Min(1, { message: 'Số khách phải >= 1' })
  numGuests!: number;

  @ApiProperty({ example: '1750000', description: 'Tổng giá trị gói (Decimal dạng chuỗi hoặc số)' })
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) return value;
    return String(value);
  })
  @IsString({ message: 'Tổng giá phải là số hoặc chuỗi số' })
  totalPrice!: string;

  @ApiProperty({ example: '2026-01-01', description: 'Ngày bắt đầu hiệu lực (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'validFrom phải là ngày hợp lệ dạng YYYY-MM-DD' })
  validFrom!: string;

  @ApiProperty({ example: '2026-12-31', description: 'Ngày kết thúc hiệu lực (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'validTo phải là ngày hợp lệ dạng YYYY-MM-DD' })
  validTo!: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết gói' })
  @IsOptional()
  @IsString({ message: 'detail phải là chuỗi ký tự' })
  @MaxLength(2000, { message: 'detail tối đa 2000 ký tự' })
  detail?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean({ message: 'active phải là boolean' })
  active?: boolean;
}
