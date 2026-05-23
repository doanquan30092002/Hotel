import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FinanceTxType } from '@prisma/client';

type FinanceTxRow = {
  id: string;
  code: string;
  type: FinanceTxType;
  group: { id: string; code: string; name: string };
  booking: { id: string; code: string } | null;
  method: { id: string; code: string; name: string } | null;
  description: string;
  amount: { toString(): string };
  occurredAt: Date;
  createdBy: { id: string; fullName: string; role: string } | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class FinanceTxEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: FinanceTxType }) type!: FinanceTxType;
  @ApiProperty() group!: { id: string; code: string; name: string };
  @ApiPropertyOptional() booking!: { id: string; code: string } | null;
  @ApiPropertyOptional() method!: { id: string; code: string; name: string } | null;
  @ApiProperty() description!: string;
  @ApiProperty() amount!: string;
  @ApiProperty() occurredAt!: string;
  @ApiPropertyOptional() createdBy!: { id: string; fullName: string; role: string } | null;
  @ApiPropertyOptional() note!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(t: FinanceTxRow): FinanceTxEntity {
    const e = new FinanceTxEntity();
    e.id = t.id;
    e.code = t.code;
    e.type = t.type;
    e.group = t.group;
    e.booking = t.booking;
    e.method = t.method;
    e.description = t.description;
    e.amount = t.amount.toString();
    e.occurredAt = t.occurredAt.toISOString().slice(0, 10);
    e.createdBy = t.createdBy;
    e.note = t.note;
    e.createdAt = t.createdAt.toISOString();
    e.updatedAt = t.updatedAt.toISOString();
    return e;
  }
}
