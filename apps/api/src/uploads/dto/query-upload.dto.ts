import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { UploadKind } from '@prisma/client';

import { PageQueryDto } from '../../common/dto/page-query.dto';

export class QueryUploadDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: UploadKind })
  @IsOptional()
  @IsEnum(UploadKind)
  kind?: UploadKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  /**
   * Keyword search: matches code / fileName / fileId
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyword?: string;
}
