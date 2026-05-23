import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'statusId bắt buộc' })
  statusId!: string;
}
