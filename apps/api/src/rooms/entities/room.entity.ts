import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

interface CategoryRef {
  id: string;
  code: string;
  name: string;
}

interface PrismaRoom {
  id: string;
  code: string;
  name: string;
  typeId: string;
  type: CategoryRef;
  areaId: string | null;
  area: CategoryRef | null;
  capacity: number;
  basePrice: Decimal;
  weekendPrice: Decimal | null;
  holidayPrice: Decimal | null;
  statusId: string;
  status: CategoryRef;
  cleaningStatusId: string;
  cleaningStatus: CategoryRef;
  defaultCheckIn: string | null;
  defaultCheckOut: string | null;
  images: string[];
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryRefEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class RoomEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() typeId!: string;
  @ApiProperty({ type: CategoryRefEntity }) type!: CategoryRefEntity;
  @ApiPropertyOptional({ nullable: true }) areaId!: string | null;
  @ApiPropertyOptional({ type: CategoryRefEntity, nullable: true }) area!: CategoryRefEntity | null;
  @ApiProperty() capacity!: number;
  @ApiProperty({ description: 'Decimal as string to preserve precision' }) basePrice!: string;
  @ApiPropertyOptional({ nullable: true }) weekendPrice!: string | null;
  @ApiPropertyOptional({ nullable: true }) holidayPrice!: string | null;
  @ApiProperty() statusId!: string;
  @ApiProperty({ type: CategoryRefEntity }) status!: CategoryRefEntity;
  @ApiProperty() cleaningStatusId!: string;
  @ApiProperty({ type: CategoryRefEntity }) cleaningStatus!: CategoryRefEntity;
  @ApiPropertyOptional({ nullable: true }) defaultCheckIn!: string | null;
  @ApiPropertyOptional({ nullable: true }) defaultCheckOut!: string | null;
  @ApiProperty({ isArray: true, type: String }) images!: string[];
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(room: PrismaRoom): RoomEntity {
    const entity = new RoomEntity();
    entity.id = room.id;
    entity.code = room.code;
    entity.name = room.name;
    entity.typeId = room.typeId;
    entity.type = { id: room.type.id, code: room.type.code, name: room.type.name };
    entity.areaId = room.areaId;
    entity.area = room.area
      ? { id: room.area.id, code: room.area.code, name: room.area.name }
      : null;
    entity.capacity = room.capacity;
    entity.basePrice = room.basePrice.toString();
    entity.weekendPrice = room.weekendPrice ? room.weekendPrice.toString() : null;
    entity.holidayPrice = room.holidayPrice ? room.holidayPrice.toString() : null;
    entity.statusId = room.statusId;
    entity.status = { id: room.status.id, code: room.status.code, name: room.status.name };
    entity.cleaningStatusId = room.cleaningStatusId;
    entity.cleaningStatus = {
      id: room.cleaningStatus.id,
      code: room.cleaningStatus.code,
      name: room.cleaningStatus.name,
    };
    entity.defaultCheckIn = room.defaultCheckIn;
    entity.defaultCheckOut = room.defaultCheckOut;
    entity.images = room.images;
    entity.note = room.note;
    entity.createdAt = room.createdAt;
    entity.updatedAt = room.updatedAt;
    return entity;
  }
}
