import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';

interface PrismaCategory {
  id: string;
  group: CategoryGroup;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class CategoryEntity {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CategoryGroup }) group!: CategoryGroup;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional({ nullable: true }) meta!: unknown;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(c: PrismaCategory): CategoryEntity {
    const entity = new CategoryEntity();
    entity.id = c.id;
    entity.group = c.group;
    entity.code = c.code;
    entity.name = c.name;
    entity.sortOrder = c.sortOrder;
    entity.active = c.active;
    entity.meta = c.meta;
    entity.createdAt = c.createdAt;
    entity.updatedAt = c.updatedAt;
    // deletedAt intentionally excluded from API response
    return entity;
  }
}
