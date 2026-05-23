import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({ description: 'HH:mm' })
  @IsOptional()
  @IsString()
  checkInTime?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'HH:mm' })
  @IsOptional()
  @IsString()
  checkOutTime?: string;
}
