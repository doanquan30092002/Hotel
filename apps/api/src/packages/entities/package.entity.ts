import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

interface PrismaPricePackage {
  id: string;
  code: string;
  name: string;
  applyType: string;
  numNights: number;
  numGuests: number;
  totalPrice: Decimal;
  validFrom: Date;
  validTo: Date;
  detail: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PackageEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() applyType!: string;
  @ApiProperty() numNights!: number;
  @ApiProperty() numGuests!: number;
  @ApiProperty({ description: 'Tổng giá gói (Decimal dưới dạng chuỗi)' }) totalPrice!: string;
  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực (ISO date)' }) validFrom!: string;
  @ApiProperty({ description: 'Ngày kết thúc hiệu lực (ISO date)' }) validTo!: string;
  @ApiPropertyOptional({ nullable: true }) detail!: string | null;
  @ApiProperty() active!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(row: PrismaPricePackage): PackageEntity {
    const entity = new PackageEntity();
    entity.id = row.id;
    entity.code = row.code;
    entity.name = row.name;
    entity.applyType = row.applyType;
    entity.numNights = row.numNights;
    entity.numGuests = row.numGuests;
    entity.totalPrice = row.totalPrice.toString();
    // validFrom / validTo are @db.Date — stored as midnight UTC; return ISO date string
    entity.validFrom = row.validFrom.toISOString().split('T')[0] ?? row.validFrom.toISOString();
    entity.validTo = row.validTo.toISOString().split('T')[0] ?? row.validTo.toISOString();
    entity.detail = row.detail;
    entity.active = row.active;
    entity.createdAt = row.createdAt;
    entity.updatedAt = row.updatedAt;
    return entity;
  }
}
