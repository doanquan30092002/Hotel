import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffEntity } from './entities/staff.entity';

// ── include constant ───────────────────────────────────────────────────────────

const STAFF_INCLUDE = {
  position: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class StaffService {
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

  /**
   * Generate next staff code: NS001, NS002, ...
   */
  private async nextCode(): Promise<string> {
    const count = await this.prisma.staff.count({ where: { deletedAt: null } });
    const candidate = `NS${String(count + 1).padStart(3, '0')}`;

    const exists = await this.prisma.staff.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    // Fallback: find max numeric code and increment
    const last = await this.prisma.staff.findFirst({
      where: { code: { startsWith: 'NS' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('NS', ''), 10);
    return `NS${String(num + 1).padStart(3, '0')}`;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryStaffDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.StaffWhereInput = {
      deletedAt: null,
      ...(query.positionId ? { positionId: query.positionId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { fullName: { contains: query.keyword, mode: 'insensitive' } },
              { phone: { contains: query.keyword, mode: 'insensitive' } },
              { email: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ code: 'asc' }],
        include: STAFF_INCLUDE,
      }),
      this.prisma.staff.count({ where }),
    ]);

    return paginate(rows.map(StaffEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<StaffEntity> {
    const staff = await this.prisma.staff.findFirst({
      where: { id, deletedAt: null },
      include: STAFF_INCLUDE,
    });

    if (!staff) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }

    return StaffEntity.from(staff);
  }

  async create(dto: CreateStaffDto): Promise<StaffEntity> {
    if (dto.positionId) {
      await this.assertCategoryGroup(dto.positionId, CategoryGroup.STAFF_POSITION, 'positionId');
    }

    const code = await this.nextCode();

    const staff = await this.prisma.staff.create({
      data: {
        code,
        fullName: dto.fullName,
        positionId: dto.positionId ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        shiftType: dto.shiftType ?? 'day',
        joinDate: new Date(dto.joinDate),
        baseSalary: new Prisma.Decimal(dto.baseSalary),
        allowance:
          dto.allowance !== undefined ? new Prisma.Decimal(dto.allowance) : new Prisma.Decimal(0),
        active: dto.active ?? true,
        avatarUrl: dto.avatarUrl ?? null,
        note: dto.note ?? null,
      },
      include: STAFF_INCLUDE,
    });

    return StaffEntity.from(staff);
  }

  async update(id: string, dto: UpdateStaffDto): Promise<StaffEntity> {
    const existing = await this.prisma.staff.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }

    if (dto.positionId !== undefined && dto.positionId !== null) {
      await this.assertCategoryGroup(dto.positionId, CategoryGroup.STAFF_POSITION, 'positionId');
    }

    await this.prisma.staff.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...('positionId' in dto ? { positionId: dto.positionId ?? null } : {}),
        ...('phone' in dto ? { phone: dto.phone ?? null } : {}),
        ...('email' in dto ? { email: dto.email ?? null } : {}),
        ...(dto.shiftType !== undefined ? { shiftType: dto.shiftType } : {}),
        ...(dto.joinDate !== undefined ? { joinDate: new Date(dto.joinDate) } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: new Prisma.Decimal(dto.baseSalary) } : {}),
        ...(dto.allowance !== undefined ? { allowance: new Prisma.Decimal(dto.allowance) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...('avatarUrl' in dto ? { avatarUrl: dto.avatarUrl ?? null } : {}),
        ...('note' in dto ? { note: dto.note ?? null } : {}),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.staff.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }

    await this.prisma.staff.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
