import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePayrollStatusDto {
  @ApiProperty({ description: 'ID trạng thái mới (PAYROLL_STATUS)' })
  @IsString()
  @IsNotEmpty()
  statusId!: string;
}
