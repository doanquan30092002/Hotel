import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDto {
  @ApiPropertyOptional({
    description: 'ID người được phân công (User). Truyền null để huỷ phân công.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
