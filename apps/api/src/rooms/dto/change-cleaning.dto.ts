import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeCleaningDto {
  @ApiProperty({ description: 'ID danh mục trạng thái dọn phòng (group = CLEANING_STATUS)' })
  @IsString({ message: 'cleaningStatusId phải là chuỗi ký tự' })
  cleaningStatusId!: string;
}
