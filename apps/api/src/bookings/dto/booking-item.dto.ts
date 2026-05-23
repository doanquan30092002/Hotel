import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import { BookingItemKind } from '@prisma/client';

export class BookingItemDto {
  @ApiProperty({ enum: BookingItemKind })
  @IsEnum(BookingItemKind, { message: 'kind không hợp lệ' })
  kind!: BookingItemKind;

  @ApiPropertyOptional()
  @ValidateIf((o: BookingItemDto) => o.kind === BookingItemKind.ROOM)
  @IsString({ message: 'roomId phải là chuỗi' })
  @IsNotEmpty({ message: 'roomId bắt buộc khi kind=ROOM' })
  roomId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: BookingItemDto) => o.kind === BookingItemKind.SERVICE)
  @IsString()
  @IsNotEmpty({ message: 'serviceId bắt buộc khi kind=SERVICE' })
  serviceId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: BookingItemDto) => o.kind === BookingItemKind.SURCHARGE)
  @IsString()
  @IsNotEmpty({ message: 'surchargeTypeId bắt buộc khi kind=SURCHARGE' })
  surchargeTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refName?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'quantity phải là số' })
  @Min(0, { message: 'quantity không được âm' })
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'unitPrice phải là số' })
  @Min(0, { message: 'unitPrice không được âm' })
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
