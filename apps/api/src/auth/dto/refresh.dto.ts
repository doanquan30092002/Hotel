import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty()
  @IsString({ message: 'Refresh token phải là chuỗi ký tự' })
  refreshToken!: string;
}
