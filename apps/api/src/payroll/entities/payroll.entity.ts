import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type CategoryRef = { id: string; code: string; name: string };

type StaffRef = {
  id: string;
  code: string;
  fullName: string;
  avatarUrl: string | null;
  position: CategoryRef | null;
};

type PayrollRow = {
  id: string;
  code: string;
  month: string;
  staff: StaffRef;
  workingDays: number;
  baseSalary: { toString(): string };
  allowance: { toString(): string };
  bonus: { toString(): string };
  penalty: { toString(): string };
  netSalary: { toString(): string };
  status: CategoryRef;
  paidAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PayrollEntity {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() month!: string;
  @ApiProperty() staff!: StaffRef;
  @ApiProperty() workingDays!: number;
  @ApiProperty() baseSalary!: string;
  @ApiProperty() allowance!: string;
  @ApiProperty() bonus!: string;
  @ApiProperty() penalty!: string;
  @ApiProperty() netSalary!: string;
  @ApiProperty() status!: CategoryRef;
  @ApiPropertyOptional() paidAt!: string | null;
  @ApiPropertyOptional() note!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  static from(p: PayrollRow): PayrollEntity {
    const e = new PayrollEntity();
    e.id = p.id;
    e.code = p.code;
    e.month = p.month;
    e.staff = p.staff;
    e.workingDays = p.workingDays;
    e.baseSalary = p.baseSalary.toString();
    e.allowance = p.allowance.toString();
    e.bonus = p.bonus.toString();
    e.penalty = p.penalty.toString();
    e.netSalary = p.netSalary.toString();
    e.status = p.status;
    e.paidAt = p.paidAt ? p.paidAt.toISOString() : null;
    e.note = p.note;
    e.createdAt = p.createdAt.toISOString();
    e.updatedAt = p.updatedAt.toISOString();
    return e;
  }
}
