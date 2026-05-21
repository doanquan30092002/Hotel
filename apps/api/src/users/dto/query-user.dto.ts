import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryUserDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Trạng thái không hợp lệ' })
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Tìm theo email hoặc họ tên' })
  @IsOptional()
  @IsString({ message: 'Từ khoá phải là chuỗi ký tự' })
  keyword?: string;
}
