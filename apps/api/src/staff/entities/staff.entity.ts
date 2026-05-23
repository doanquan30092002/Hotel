import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type CategoryRef = { id: string; code: string; name: string };

type StaffRow = {
  id: string;
  code: string;
  fullName: string;
  department: CategoryRef | null;
  position: CategoryRef | null;
  phone: string | null;
  email: string | null;
  shiftType: string;
  joinDate: Date;
  baseSalary: { toString(): string };
  allowance: { toString(): string };
  active: boolean;
  avatarUrl: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class StaffEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional() department!: CategoryRef | null;
  @ApiPropertyOptional() position!: CategoryRef | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() email!: string | null;
  @ApiProperty({ enum: ['day', 'night', 'full'] }) shiftType!: string;
  @ApiProperty() joinDate!: string;
  @ApiProperty() baseSalary!: string;
  @ApiProperty() allowance!: string;
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional() avatarUrl!: string | null;
  @ApiPropertyOptional() note!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(s: StaffRow): StaffEntity {
    const e = new StaffEntity();
    e.id = s.id;
    e.code = s.code;
    e.fullName = s.fullName;
    e.department = s.department;
    e.position = s.position;
    e.phone = s.phone;
    e.email = s.email;
    e.shiftType = s.shiftType;
    e.joinDate = s.joinDate.toISOString().slice(0, 10);
    e.baseSalary = s.baseSalary.toString();
    e.allowance = s.allowance.toString();
    e.active = s.active;
    e.avatarUrl = s.avatarUrl;
    e.note = s.note;
    e.createdAt = s.createdAt.toISOString();
    e.updatedAt = s.updatedAt.toISOString();
    return e;
  }
}
