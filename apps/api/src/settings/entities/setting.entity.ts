import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

// Prisma Setting shape
interface PrismaSetting {
  id: string;
  propertyName: string;
  taxCode: string | null;
  address: string | null;
  email: string | null;
  website: string | null;
  hotline: string | null;
  themeTone: number;
  monthlyRevenueTarget: Decimal | null;
  note: string | null;
  updatedAt: Date;
}

export class SettingEntity {
  @ApiProperty() id!: string;
  @ApiProperty() propertyName!: string;
  @ApiPropertyOptional({ nullable: true }) taxCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) website!: string | null;
  @ApiPropertyOptional({ nullable: true }) hotline!: string | null;
  @ApiProperty() themeTone!: number;
  @ApiPropertyOptional({ nullable: true, description: 'Decimal as string' })
  monthlyRevenueTarget!: string | null;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty() updatedAt!: Date;

  static from(s: PrismaSetting): SettingEntity {
    const entity = new SettingEntity();
    entity.id = s.id;
    entity.propertyName = s.propertyName;
    entity.taxCode = s.taxCode;
    entity.address = s.address;
    entity.email = s.email;
    entity.website = s.website;
    entity.hotline = s.hotline;
    entity.themeTone = s.themeTone;
    entity.monthlyRevenueTarget = s.monthlyRevenueTarget?.toString() ?? null;
    entity.note = s.note;
    entity.updatedAt = s.updatedAt;
    return entity;
  }
}
