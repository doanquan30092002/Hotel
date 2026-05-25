import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CategoryGroup, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePayrollStatusDto } from './dto/change-status.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { QueryPayrollDto } from './dto/query-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollEntity } from './entities/payroll.entity';

// ── include constant ───────────────────────────────────────────────────────────

const PAYROLL_INCLUDE = {
  staff: {
    select: {
      id: true,
      code: true,
      fullName: true,
      avatarUrl: true,
      position: { select: { id: true, code: true, name: true } },
    },
  },
  status: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ─────────────────────────────────────────────────────────────────

  private async assertCategoryGroup(
    id: string,
    expectedGroup: CategoryGroup,
    fieldLabel: string,
  ): Promise<void> {
    const cat = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { group: true },
    });
    if (!cat) {
      throw new BadRequestException(`${fieldLabel} không tìm thấy danh mục tương ứng`);
    }
    if (cat.group !== expectedGroup) {
      throw new BadRequestException(`${fieldLabel} phải thuộc nhóm danh mục ${expectedGroup}`);
    }
  }

  private async assertStaffExists(staffId: string): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, deletedAt: null },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException('staffId không tìm thấy nhân viên tương ứng');
    }
  }

  private async getDraftStatusId(): Promise<string> {
    const cat = await this.prisma.category.findFirst({
      where: { group: CategoryGroup.PAYROLL_STATUS, code: 'draft', deletedAt: null },
      select: { id: true },
    });
    if (!cat) {
      throw new BadRequestException('Trạng thái PAYROLL_STATUS/draft không tồn tại');
    }
    return cat.id;
  }

  private async getStatusCodeById(statusId: string): Promise<string> {
    const cat = await this.prisma.category.findFirst({
      where: { id: statusId, deletedAt: null },
      select: { code: true },
    });
    return cat?.code ?? '';
  }

  /**
   * Compute netSalary server-side (always overrides any client value).
   */
  private computeNet(
    base: number | Prisma.Decimal,
    allowance: number | Prisma.Decimal,
    bonus: number | Prisma.Decimal,
    penalty: number | Prisma.Decimal,
  ): Prisma.Decimal {
    const b = new Prisma.Decimal(base.toString());
    const a = new Prisma.Decimal(allowance.toString());
    const bo = new Prisma.Decimal(bonus.toString());
    const p = new Prisma.Decimal(penalty.toString());
    return b.add(a).add(bo).sub(p);
  }

  /**
   * Generate next payroll code: BL001, BL002, ...
   */
  private async nextCode(): Promise<string> {
    const count = await this.prisma.payroll.count({ where: { deletedAt: null } });
    const candidate = `BL${String(count + 1).padStart(3, '0')}`;

    const exists = await this.prisma.payroll.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    // Fallback: find max numeric code and increment
    const last = await this.prisma.payroll.findFirst({
      where: { code: { startsWith: 'BL' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('BL', ''), 10);
    return `BL${String(num + 1).padStart(3, '0')}`;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryPayrollDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PayrollWhereInput = {
      deletedAt: null,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { staff: { fullName: { contains: query.keyword, mode: 'insensitive' } } },
              { staff: { code: { contains: query.keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ month: 'desc' }, { code: 'asc' }],
        include: PAYROLL_INCLUDE,
      }),
      this.prisma.payroll.count({ where }),
    ]);

    return paginate(rows.map(PayrollEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<PayrollEntity> {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
      include: PAYROLL_INCLUDE,
    });

    if (!payroll) {
      throw new NotFoundException('Bảng lương không tồn tại');
    }

    return PayrollEntity.from(payroll);
  }

  async create(dto: CreatePayrollDto): Promise<PayrollEntity> {
    await this.assertStaffExists(dto.staffId);
    await this.assertCategoryGroup(dto.statusId, CategoryGroup.PAYROLL_STATUS, 'statusId');

    const baseSalary = dto.baseSalary;
    const allowance = dto.allowance ?? 0;
    const bonus = dto.bonus ?? 0;
    const penalty = dto.penalty ?? 0;
    const netSalary = this.computeNet(baseSalary, allowance, bonus, penalty);

    const code = await this.nextCode();

    try {
      const payroll = await this.prisma.payroll.create({
        data: {
          code,
          month: dto.month,
          staffId: dto.staffId,
          workingDays: dto.workingDays,
          baseSalary: new Prisma.Decimal(baseSalary),
          allowance: new Prisma.Decimal(allowance),
          bonus: new Prisma.Decimal(bonus),
          penalty: new Prisma.Decimal(penalty),
          netSalary,
          statusId: dto.statusId,
          note: dto.note ?? null,
        },
        include: PAYROLL_INCLUDE,
      });

      return PayrollEntity.from(payroll);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Đã có bảng lương của nhân sự này trong tháng');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePayrollDto): Promise<PayrollEntity> {
    const existing = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Bảng lương không tồn tại');
    }

    if (dto.staffId !== undefined) {
      await this.assertStaffExists(dto.staffId);
    }
    if (dto.statusId !== undefined) {
      await this.assertCategoryGroup(dto.statusId, CategoryGroup.PAYROLL_STATUS, 'statusId');
    }

    // Recompute netSalary with merged values
    const baseSalary = dto.baseSalary !== undefined ? dto.baseSalary : Number(existing.baseSalary);
    const allowance = dto.allowance !== undefined ? dto.allowance : Number(existing.allowance);
    const bonus = dto.bonus !== undefined ? dto.bonus : Number(existing.bonus);
    const penalty = dto.penalty !== undefined ? dto.penalty : Number(existing.penalty);
    const netSalary = this.computeNet(baseSalary, allowance, bonus, penalty);

    try {
      await this.prisma.payroll.update({
        where: { id },
        data: {
          ...(dto.month !== undefined ? { month: dto.month } : {}),
          ...(dto.staffId !== undefined ? { staffId: dto.staffId } : {}),
          ...(dto.workingDays !== undefined ? { workingDays: dto.workingDays } : {}),
          baseSalary: new Prisma.Decimal(baseSalary),
          allowance: new Prisma.Decimal(allowance),
          bonus: new Prisma.Decimal(bonus),
          penalty: new Prisma.Decimal(penalty),
          netSalary,
          ...(dto.statusId !== undefined ? { statusId: dto.statusId } : {}),
          ...('note' in dto ? { note: dto.note ?? null } : {}),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Đã có bảng lương của nhân sự này trong tháng');
      }
      throw err;
    }

    return this.findOne(id);
  }

  async changeStatus(id: string, dto: ChangePayrollStatusDto): Promise<PayrollEntity> {
    const existing = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Bảng lương không tồn tại');
    }

    await this.assertCategoryGroup(dto.statusId, CategoryGroup.PAYROLL_STATUS, 'statusId');

    const newStatusCode = await this.getStatusCodeById(dto.statusId);

    // Auto-set/clear paidAt based on status
    let paidAt: Date | null | undefined;
    if (newStatusCode === 'paid' && !existing.paidAt) {
      paidAt = new Date();
    } else if (newStatusCode !== 'paid') {
      paidAt = null;
    }

    await this.prisma.payroll.update({
      where: { id },
      data: {
        statusId: dto.statusId,
        ...(paidAt !== undefined ? { paidAt } : {}),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.payroll.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Bảng lương không tồn tại');
    }

    await this.prisma.payroll.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Generate payroll ────────────────────────────────────────────────────────

  async generate(dto: GeneratePayrollDto): Promise<{ created: number; skipped: number }> {
    const draftStatusId = await this.getDraftStatusId();
    const workingDays = dto.workingDays ?? 28;

    let created = 0;
    let skipped = 0;

    await this.prisma.$transaction(async (tx) => {
      // Find all active staff
      const activeStaffs = await tx.staff.findMany({
        where: { active: true, deletedAt: null },
        select: {
          id: true,
          baseSalary: true,
          allowance: true,
        },
      });

      // Find staffIds that already have a payroll for this month (including soft-deleted = exclude)
      const existingPayrolls = await tx.payroll.findMany({
        where: {
          month: dto.month,
          staffId: { in: activeStaffs.map((s) => s.id) },
          deletedAt: null,
        },
        select: { staffId: true },
      });
      const existingStaffIds = new Set(existingPayrolls.map((p) => p.staffId));

      for (const staff of activeStaffs) {
        if (existingStaffIds.has(staff.id)) {
          skipped += 1;
          continue;
        }

        const netSalary = this.computeNet(staff.baseSalary, staff.allowance, 0, 0);

        const code = await this.nextCodeInTx(tx);

        await tx.payroll.create({
          data: {
            code,
            month: dto.month,
            staffId: staff.id,
            workingDays,
            baseSalary: staff.baseSalary,
            allowance: staff.allowance,
            bonus: new Prisma.Decimal(0),
            penalty: new Prisma.Decimal(0),
            netSalary,
            statusId: draftStatusId,
          },
        });

        created += 1;
      }
    });

    return { created, skipped };
  }

  // ── XLSX export ──────────────────────────────────────────────────────────────

  async generateXlsx(query: QueryPayrollDto): Promise<Buffer> {
    const where: Prisma.PayrollWhereInput = {
      deletedAt: null,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { staff: { fullName: { contains: query.keyword, mode: 'insensitive' } } },
              { staff: { code: { contains: query.keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.payroll.findMany({
      where,
      orderBy: [{ month: 'desc' }, { code: 'asc' }],
      include: PAYROLL_INCLUDE,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel Management';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bảng lương');
    sheet.columns = [
      { header: 'Mã', key: 'code', width: 12 },
      { header: 'Tháng', key: 'month', width: 12 },
      { header: 'Mã NS', key: 'staffCode', width: 14 },
      { header: 'Nhân sự', key: 'staffName', width: 26 },
      { header: 'Chức vụ', key: 'position', width: 20 },
      { header: 'Ngày công', key: 'workingDays', width: 12 },
      { header: 'Lương cơ bản', key: 'baseSalary', width: 16 },
      { header: 'Phụ cấp', key: 'allowance', width: 14 },
      { header: 'Thưởng', key: 'bonus', width: 14 },
      { header: 'Phạt', key: 'penalty', width: 14 },
      { header: 'Thực nhận', key: 'netSalary', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Ngày trả', key: 'paidAt', width: 18 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];

    const moneyCols = ['baseSalary', 'allowance', 'bonus', 'penalty', 'netSalary'];

    let totalBase = new Prisma.Decimal(0);
    let totalAllowance = new Prisma.Decimal(0);
    let totalBonus = new Prisma.Decimal(0);
    let totalPenalty = new Prisma.Decimal(0);
    let totalNet = new Prisma.Decimal(0);

    for (const p of rows) {
      const baseSalary = new Prisma.Decimal(p.baseSalary.toString());
      const allowance = new Prisma.Decimal(p.allowance.toString());
      const bonus = new Prisma.Decimal(p.bonus.toString());
      const penalty = new Prisma.Decimal(p.penalty.toString());
      const netSalary = new Prisma.Decimal(p.netSalary.toString());

      totalBase = totalBase.add(baseSalary);
      totalAllowance = totalAllowance.add(allowance);
      totalBonus = totalBonus.add(bonus);
      totalPenalty = totalPenalty.add(penalty);
      totalNet = totalNet.add(netSalary);

      sheet.addRow({
        code: p.code,
        month: p.month,
        staffCode: p.staff.code,
        staffName: p.staff.fullName,
        position: p.staff.position?.name ?? '',
        workingDays: p.workingDays,
        baseSalary: Number(baseSalary),
        allowance: Number(allowance),
        bonus: Number(bonus),
        penalty: Number(penalty),
        netSalary: Number(netSalary),
        status: p.status.name,
        paidAt: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : '',
        note: p.note ?? '',
      });
    }

    // Totals row
    const totalsRow = sheet.addRow({
      code: 'TỔNG',
      month: '',
      staffCode: '',
      staffName: '',
      position: '',
      workingDays: '',
      baseSalary: Number(totalBase),
      allowance: Number(totalAllowance),
      bonus: Number(totalBonus),
      penalty: Number(totalPenalty),
      netSalary: Number(totalNet),
      status: '',
      paidAt: '',
      note: '',
    });
    totalsRow.font = { bold: true };
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };

    // Apply VND format to money columns
    for (const colKey of moneyCols) {
      const col = sheet.getColumn(colKey);
      col.numFmt = '#,##0';
    }

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * nextCode() variant that works inside a transaction.
   * Uses direct count + findFirst on the tx client.
   */
  private async nextCodeInTx(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.payroll.count({ where: { deletedAt: null } });
    const candidate = `BL${String(count + 1).padStart(3, '0')}`;

    const exists = await tx.payroll.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    const last = await tx.payroll.findFirst({
      where: { code: { startsWith: 'BL' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('BL', ''), 10);
    return `BL${String(num + 1).padStart(3, '0')}`;
  }
}
