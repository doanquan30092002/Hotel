import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeStatusDto {
  @ApiProperty({ description: 'ID trạng thái mới (Category nhóm HOUSEKEEPING_TASK_STATUS)' })
  @IsString()
  @IsNotEmpty()
  statusId!: string;
}
