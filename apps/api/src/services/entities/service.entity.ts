import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

interface CategoryRef {
  id: string;
  code: string;
  name: string;
}

interface PrismaService {
  id: string;
  code: string;
  name: string;
  groupId: string;
  group: CategoryRef;
  unitId: string;
  unit: CategoryRef;
  price: Decimal;
  active: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ServiceCategoryEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class ServiceEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() groupId!: string;
  @ApiProperty({ type: ServiceCategoryEntity }) group!: ServiceCategoryEntity;
  @ApiProperty() unitId!: string;
  @ApiProperty({ type: ServiceCategoryEntity }) unit!: ServiceCategoryEntity;
  @ApiProperty({ description: 'Đơn giá (Decimal dưới dạng chuỗi)' }) price!: string;
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(row: PrismaService): ServiceEntity {
    const entity = new ServiceEntity();
    entity.id = row.id;
    entity.code = row.code;
    entity.name = row.name;
    entity.groupId = row.groupId;
    entity.group = {
      id: row.group.id,
      code: row.group.code,
      name: row.group.name,
    };
    entity.unitId = row.unitId;
    entity.unit = {
      id: row.unit.id,
      code: row.unit.code,
      name: row.unit.name,
    };
    entity.price = row.price.toString();
    entity.active = row.active;
    entity.note = row.note;
    entity.createdAt = row.createdAt;
    entity.updatedAt = row.updatedAt;
    return entity;
  }
}
