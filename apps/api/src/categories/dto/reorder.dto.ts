import { ApiProperty } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';
import { ArrayMinSize, IsEnum, IsString } from 'class-validator';

export class ReorderDto {
  @ApiProperty({ enum: CategoryGroup, description: 'Nhóm danh mục cần sắp xếp lại' })
  @IsEnum(CategoryGroup, { message: 'Nhóm danh mục không hợp lệ' })
  group!: CategoryGroup;

  @ApiProperty({ type: [String], description: 'Danh sách id theo thứ tự mới' })
  @ArrayMinSize(1, { message: 'Danh sách id phải có ít nhất 1 phần tử' })
  @IsString({ each: true, message: 'Mỗi id phải là chuỗi ký tự' })
  orderedIds!: string[];
}
