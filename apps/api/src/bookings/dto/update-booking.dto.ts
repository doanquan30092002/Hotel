import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { BookingItemDto } from './booking-item.dto';
import { BookingPaymentDto } from './booking-payment.dto';
import { CreateBookingCustomerDto } from './create-booking.dto';

export class UpdateBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'checkIn phải đúng định dạng ngày' })
  checkIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'checkOut phải đúng định dạng ngày' })
  checkOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  adults?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  children?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numRooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: CreateBookingCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateBookingCustomerDto)
  customer?: CreateBookingCustomerDto;

  @ApiPropertyOptional({ type: [BookingItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items?: BookingItemDto[];

  @ApiPropertyOptional({ type: [BookingPaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingPaymentDto)
  payments?: BookingPaymentDto[];
}
