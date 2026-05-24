import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DashboardTab {
  OVERVIEW = 'overview',
  BOOKING_OCCUPANCY = 'booking_occupancy',
  FINANCE = 'finance',
  HOUSEKEEPING = 'housekeeping',
}

export class QueryDashboardDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-05-01' })
  @IsISO8601({ strict: true }, { message: 'from phải đúng định dạng ngày YYYY-MM-DD' })
  from!: string;

  @ApiProperty({ description: 'End date exclusive (YYYY-MM-DD)', example: '2026-06-01' })
  @IsISO8601({ strict: true }, { message: 'to phải đúng định dạng ngày YYYY-MM-DD' })
  to!: string;

  @ApiPropertyOptional({
    enum: DashboardTab,
    default: DashboardTab.OVERVIEW,
    description: 'Dashboard tab to retrieve data for',
  })
  @IsOptional()
  @IsEnum(DashboardTab, {
    message: 'tab phải là overview | booking_occupancy | finance | housekeeping',
  })
  tab?: DashboardTab = DashboardTab.OVERVIEW;
}
