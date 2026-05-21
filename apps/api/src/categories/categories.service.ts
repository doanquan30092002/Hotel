import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface GroupCount {
  group: CategoryGroup;
  total: number;
  active: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryCategoriesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(query.group !== undefined ? { group: query.group } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword, mode: 'insensitive' } },
              { code: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.category.count({ where }),
    ]);

    return paginate(rows.map(CategoryEntity.from), total, page, pageSize);
  }

  async groupCounts(): Promise<{ data: GroupCount[] }> {
    const [totalCounts, activeCounts] = await Promise.all([
      this.prisma.category.groupBy({
        by: ['group'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.category.groupBy({
        by: ['group'],
        where: { deletedAt: null, active: true },
        _count: { _all: true },
      }),
    ]);

    const activeMap = new Map<CategoryGroup, number>(
      activeCounts.map((r) => [r.group, r._count._all]),
    );

    const allGroups = Object.values(CategoryGroup);

    const totalMap = new Map<CategoryGroup, number>(
      totalCounts.map((r) => [r.group, r._count._all]),
    );

    const data: GroupCount[] = allGroups.map((group) => ({
      group,
      total: totalMap.get(group) ?? 0,
      active: activeMap.get(group) ?? 0,
    }));

    return { data };
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const row = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });

    if (!row) {
      throw new NotFoundException('Danh mục không tồn tại');
    }

    return CategoryEntity.from(row);
  }

  async create(dto: CreateCategoryDto, _userId: string): Promise<CategoryEntity> {
    // Reuse soft-deleted (group, code) row if present — the DB has a non-partial
    // unique on (group, code), so we must "resurrect" instead of inserting.
    const existing = await this.prisma.category.findUnique({
      where: { group_code: { group: dto.group, code: dto.code } },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Mã danh mục đã tồn tại trong nhóm');
    }

    try {
      const row = existing
        ? await this.prisma.category.update({
            where: { id: existing.id },
            data: {
              name: dto.name,
              sortOrder: dto.sortOrder ?? 0,
              active: dto.active ?? true,
              meta: (dto.meta as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
              deletedAt: null,
            },
          })
        : await this.prisma.category.create({
            data: {
              group: dto.group,
              code: dto.code,
              name: dto.name,
              sortOrder: dto.sortOrder ?? 0,
              active: dto.active ?? true,
              meta: (dto.meta as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
            },
          });

      return CategoryEntity.from(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã danh mục đã tồn tại trong nhóm');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    await this.findOne(id); // throws 404 if not found

    // group is immutable — reject if client somehow passes it
    // (UpdateCategoryDto already omits group, but double-check via runtime shape)
    if ('group' in dto && dto['group' as keyof UpdateCategoryDto] !== undefined) {
      throw new UnprocessableEntityException('Không thể đổi nhóm danh mục');
    }

    try {
      const row = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(dto.meta !== undefined ? { meta: dto.meta as Prisma.InputJsonValue } : {}),
        },
      });

      return CategoryEntity.from(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã danh mục đã tồn tại trong nhóm');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // throws 404 if not found

    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(
    group: CategoryGroup,
    orderedIds: string[],
  ): Promise<{ data: { affected: number } }> {
    let affected = 0;

    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.category.findMany({
        where: { group, deletedAt: null },
        select: { id: true },
      });

      const validIds = new Set(rows.map((r) => r.id));

      const updates = orderedIds
        .filter((id) => validIds.has(id))
        .map((id, index) =>
          tx.category.update({
            where: { id },
            data: { sortOrder: index },
          }),
        );

      await Promise.all(updates);
      affected = updates.length;
    });

    return { data: { affected } };
  }

  async toggleActive(id: string): Promise<CategoryEntity> {
    const existing = await this.findOne(id);

    const row = await this.prisma.category.update({
      where: { id },
      data: { active: !existing.active },
    });

    return CategoryEntity.from(row);
  }
}
