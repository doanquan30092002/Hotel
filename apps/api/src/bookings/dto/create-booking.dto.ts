import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { BookingItemDto } from './booking-item.dto';
import { BookingPaymentDto } from './booking-payment.dto';

export class CreateBookingCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;
}

export class CreateBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'statusId bắt buộc' })
  statusId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageId?: string;

  @ApiProperty()
  @IsDateString({}, { message: 'checkIn phải đúng định dạng ngày' })
  checkIn!: string;

  @ApiProperty()
  @IsDateString({}, { message: 'checkOut phải đúng định dạng ngày' })
  checkOut!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'adults phải là số nguyên' })
  @Min(0, { message: 'adults không được âm' })
  adults!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'children phải là số nguyên' })
  @Min(0, { message: 'children không được âm' })
  children!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'numRooms phải là số nguyên' })
  @Min(1, { message: 'numRooms tối thiểu 1' })
  numRooms!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: CreateBookingCustomerDto })
  @ValidateNested()
  @Type(() => CreateBookingCustomerDto)
  customer!: CreateBookingCustomerDto;

  @ApiProperty({ type: [BookingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items!: BookingItemDto[];

  @ApiPropertyOptional({ type: [BookingPaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingPaymentDto)
  payments?: BookingPaymentDto[];
}
