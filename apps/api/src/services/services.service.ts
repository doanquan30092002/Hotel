import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceEntity } from './entities/service.entity';

const SERVICE_INCLUDE = {
  group: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class ServicesService {
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

  private async validateGroupAndUnit(
    groupId: string | undefined,
    unitId: string | undefined,
  ): Promise<void> {
    if (groupId !== undefined) {
      await this.assertCategoryGroup(groupId, CategoryGroup.SERVICE_GROUP, 'groupId');
    }
    if (unitId !== undefined) {
      await this.assertCategoryGroup(unitId, CategoryGroup.UNIT, 'unitId');
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryServiceDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(query.groupId !== undefined ? { groupId: query.groupId } : {}),
      ...(query.unitId !== undefined ? { unitId: query.unitId } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { name: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ code: 'asc' }],
        include: SERVICE_INCLUDE,
      }),
      this.prisma.service.count({ where }),
    ]);

    return paginate(rows.map(ServiceEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<ServiceEntity> {
    const service = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: SERVICE_INCLUDE,
    });

    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }

    return ServiceEntity.from(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceEntity> {
    await this.validateGroupAndUnit(dto.groupId, dto.unitId);

    // Check for existing service with same code (resurrection path)
    const existing = await this.prisma.service.findUnique({
      where: { code: dto.code },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Mã dịch vụ đã tồn tại');
    }

    try {
      const service = existing
        ? // Resurrect soft-deleted service
          await this.prisma.service.update({
            where: { id: existing.id },
            data: {
              name: dto.name,
              groupId: dto.groupId,
              unitId: dto.unitId,
              price: dto.price,
              active: dto.active ?? true,
              note: dto.note ?? null,
              deletedAt: null,
            },
            include: SERVICE_INCLUDE,
          })
        : await this.prisma.service.create({
            data: {
              code: dto.code,
              name: dto.name,
              groupId: dto.groupId,
              unitId: dto.unitId,
              price: dto.price,
              active: dto.active ?? true,
              note: dto.note ?? null,
            },
            include: SERVICE_INCLUDE,
          });

      return ServiceEntity.from(service);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã dịch vụ đã tồn tại');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceEntity> {
    const existing = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }

    await this.validateGroupAndUnit(dto.groupId, dto.unitId);

    try {
      const service = await this.prisma.service.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
          ...(dto.unitId !== undefined ? { unitId: dto.unitId } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...('note' in dto ? { note: dto.note ?? null } : {}),
        },
        include: SERVICE_INCLUDE,
      });

      return ServiceEntity.from(service);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã dịch vụ đã tồn tại');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }

    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
