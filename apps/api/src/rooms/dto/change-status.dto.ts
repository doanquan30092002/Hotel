import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeStatusDto {
  @ApiProperty({ description: 'ID danh mục trạng thái phòng (group = ROOM_STATUS)' })
  @IsString({ message: 'statusId phải là chuỗi ký tự' })
  statusId!: string;
}
