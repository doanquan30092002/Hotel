import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface CategoryRef {
  id: string;
  code: string;
  name: string;
}

interface PrismaCustomer {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
  idNumber: string | null;
  email: string | null;
  address: string | null;
  nationality: string | null;
  sourceId: string | null;
  source: CategoryRef | null;
  note: string | null;
  docs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerSourceEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class CustomerEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) idNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) nationality!: string | null;
  @ApiPropertyOptional({ nullable: true }) sourceId!: string | null;
  @ApiPropertyOptional({ type: CustomerSourceEntity, nullable: true })
  source!: CustomerSourceEntity | null;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty({ isArray: true, type: String }) docs!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(customer: PrismaCustomer): CustomerEntity {
    const entity = new CustomerEntity();
    entity.id = customer.id;
    entity.code = customer.code;
    entity.fullName = customer.fullName;
    entity.phone = customer.phone;
    entity.idNumber = customer.idNumber;
    entity.email = customer.email;
    entity.address = customer.address;
    entity.nationality = customer.nationality;
    entity.sourceId = customer.sourceId;
    entity.source = customer.source
      ? {
          id: customer.source.id,
          code: customer.source.code,
          name: customer.source.name,
        }
      : null;
    entity.note = customer.note;
    entity.docs = customer.docs;
    entity.createdAt = customer.createdAt;
    entity.updatedAt = customer.updatedAt;
    return entity;
  }
}
