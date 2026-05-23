import { IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FinanceSummaryQueryDto {
  @ApiProperty({ description: 'Từ ngày (ISO8601 date)', example: '2026-05-01' })
  @IsISO8601({ strict: true })
  from!: string;

  @ApiProperty({ description: 'Đến ngày (ISO8601 date)', example: '2026-05-31' })
  @IsISO8601({ strict: true })
  to!: string;
}
