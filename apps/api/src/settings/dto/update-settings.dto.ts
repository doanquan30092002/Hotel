import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'Khách sạn Bình Minh' })
  @IsOptional()
  @IsString({ message: 'Tên cơ sở phải là chuỗi ký tự' })
  propertyName?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString({ message: 'Mã số thuế phải là chuỗi ký tự' })
  taxCode?: string;

  @ApiPropertyOptional({ example: '123 Đường Lê Lợi, TP.HCM' })
  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  address?: string;

  @ApiPropertyOptional({ example: 'info@hotel.local' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://hotel.local' })
  @IsOptional()
  @IsUrl({}, { message: 'Website không hợp lệ' })
  website?: string;

  @ApiPropertyOptional({ example: '1900 1234' })
  @IsOptional()
  @IsString({ message: 'Số hotline phải là chuỗi ký tự' })
  hotline?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 3, example: 2 })
  @IsOptional()
  @IsInt({ message: 'Tone giao diện phải là số nguyên' })
  @Min(1, { message: 'Tone giao diện tối thiểu là 1' })
  @Max(3, { message: 'Tone giao diện tối đa là 3' })
  themeTone?: number;

  @ApiPropertyOptional({
    example: '50000000.00',
    description: 'Decimal dạng chuỗi số hoặc null để xóa',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return null;
    return typeof value === 'number' ? String(value) : value;
  })
  @ValidateIf((_, value) => value !== null)
  @IsNumberString({}, { message: 'Mục tiêu doanh thu phải là chuỗi số' })
  monthlyRevenueTarget?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  note?: string;
}
