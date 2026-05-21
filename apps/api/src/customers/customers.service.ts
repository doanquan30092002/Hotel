import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerEntity } from './entities/customer.entity';

const CUSTOMER_INCLUDE = {
  source: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class CustomersService {
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

  private async validateSourceId(sourceId: string | undefined): Promise<void> {
    if (sourceId !== undefined) {
      await this.assertCategoryGroup(sourceId, CategoryGroup.GUEST_SOURCE, 'sourceId');
    }
  }

  /**
   * Check if a unique field (phone or idNumber) conflicts with a NON-deleted customer.
   * If a soft-deleted customer holds it — that is NOT a conflict (the resurrect path handles code).
   * But if a DIFFERENT customer (different code) holds it — that IS a conflict.
   */
  private async assertUniqueField(
    field: 'phone' | 'idNumber',
    value: string,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.CustomerWhereUniqueInput =
      field === 'phone' ? { phone: value } : { idNumber: value };

    const existing = await this.prisma.customer.findUnique({
      where,
      select: { id: true, deletedAt: true },
    });
    if (!existing) return;
    if (existing.deletedAt !== null) return; // soft-deleted — not a live conflict
    if (excludeId && existing.id === excludeId) return; // same record being updated

    const label = field === 'phone' ? 'Số điện thoại' : 'CCCD/Hộ chiếu';
    throw new ConflictException(`${label} đã được sử dụng`);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryCustomerDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.sourceId !== undefined ? { sourceId: query.sourceId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { fullName: { contains: query.keyword, mode: 'insensitive' } },
              { phone: { contains: query.keyword, mode: 'insensitive' } },
              { idNumber: { contains: query.keyword, mode: 'insensitive' } },
              { email: { contains: query.keyword, mode: 'insensitive' } },
              { code: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ code: 'asc' }],
        include: CUSTOMER_INCLUDE,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(rows.map(CustomerEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: CUSTOMER_INCLUDE,
    });

    if (!customer) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    return CustomerEntity.from(customer);
  }

  async create(dto: CreateCustomerDto): Promise<CustomerEntity> {
    await this.validateSourceId(dto.sourceId);

    // Check phone / idNumber uniqueness against active records (soft-deleted OK)
    if (dto.phone !== undefined) {
      await this.assertUniqueField('phone', dto.phone);
    }
    if (dto.idNumber !== undefined) {
      await this.assertUniqueField('idNumber', dto.idNumber);
    }

    // Check for existing customer with same code (resurrection path)
    const existing = await this.prisma.customer.findUnique({
      where: { code: dto.code },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Mã khách hàng đã tồn tại');
    }

    try {
      const customer = existing
        ? // Resurrect soft-deleted customer
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: {
              fullName: dto.fullName,
              phone: dto.phone ?? null,
              idNumber: dto.idNumber ?? null,
              email: dto.email ?? null,
              address: dto.address ?? null,
              nationality: dto.nationality ?? null,
              sourceId: dto.sourceId ?? null,
              note: dto.note ?? null,
              docs: dto.docs ?? [],
              deletedAt: null,
            },
            include: CUSTOMER_INCLUDE,
          })
        : await this.prisma.customer.create({
            data: {
              code: dto.code,
              fullName: dto.fullName,
              phone: dto.phone ?? null,
              idNumber: dto.idNumber ?? null,
              email: dto.email ?? null,
              address: dto.address ?? null,
              nationality: dto.nationality ?? null,
              sourceId: dto.sourceId ?? null,
              note: dto.note ?? null,
              docs: dto.docs ?? [],
            },
            include: CUSTOMER_INCLUDE,
          });

      return CustomerEntity.from(customer);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Determine which field caused the P2002 to give a precise message
        const target = err.meta?.['target'];
        if (Array.isArray(target) && (target as string[]).includes('phone')) {
          throw new ConflictException('Số điện thoại đã được sử dụng');
        }
        if (Array.isArray(target) && (target as string[]).includes('idNumber')) {
          throw new ConflictException('CCCD/Hộ chiếu đã được sử dụng');
        }
        throw new ConflictException('Mã khách hàng đã tồn tại');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerEntity> {
    const existing = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    await this.validateSourceId(dto.sourceId);

    // Check phone uniqueness (if being changed)
    if (dto.phone !== undefined && dto.phone !== existing.phone) {
      await this.assertUniqueField('phone', dto.phone, id);
    }
    // Check idNumber uniqueness (if being changed)
    if (dto.idNumber !== undefined && dto.idNumber !== existing.idNumber) {
      await this.assertUniqueField('idNumber', dto.idNumber, id);
    }

    // Check code uniqueness (if being changed)
    if (dto.code !== undefined && dto.code !== existing.code) {
      const codeConflict = await this.prisma.customer.findUnique({
        where: { code: dto.code },
      });
      if (codeConflict && codeConflict.deletedAt === null) {
        throw new ConflictException('Mã khách hàng đã tồn tại');
      }
    }

    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...('phone' in dto ? { phone: dto.phone ?? null } : {}),
          ...('idNumber' in dto ? { idNumber: dto.idNumber ?? null } : {}),
          ...('email' in dto ? { email: dto.email ?? null } : {}),
          ...('address' in dto ? { address: dto.address ?? null } : {}),
          ...('nationality' in dto ? { nationality: dto.nationality ?? null } : {}),
          ...('sourceId' in dto ? { sourceId: dto.sourceId ?? null } : {}),
          ...('note' in dto ? { note: dto.note ?? null } : {}),
          ...(dto.docs !== undefined ? { docs: dto.docs } : {}),
        },
        include: CUSTOMER_INCLUDE,
      });

      return CustomerEntity.from(customer);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = err.meta?.['target'];
        if (Array.isArray(target) && (target as string[]).includes('phone')) {
          throw new ConflictException('Số điện thoại đã được sử dụng');
        }
        if (Array.isArray(target) && (target as string[]).includes('idNumber')) {
          throw new ConflictException('CCCD/Hộ chiếu đã được sử dụng');
        }
        throw new ConflictException('Mã khách hàng đã tồn tại');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
