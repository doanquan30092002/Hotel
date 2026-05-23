import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { QueryPackageDto } from './dto/query-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackageEntity } from './entities/package.entity';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ─────────────────────────────────────────────────────────────────

  private assertValidDateRange(validFrom: string, validTo: string): void {
    if (new Date(validTo) < new Date(validFrom)) {
      throw new UnprocessableEntityException(
        'Ngày kết thúc hiệu lực phải lớn hơn hoặc bằng ngày bắt đầu',
      );
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryPackageDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PricePackageWhereInput = {
      deletedAt: null,
      ...(query.applyType !== undefined ? { applyType: query.applyType } : {}),
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
      this.prisma.pricePackage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ code: 'asc' }],
      }),
      this.prisma.pricePackage.count({ where }),
    ]);

    return paginate(rows.map(PackageEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<PackageEntity> {
    const pkg = await this.prisma.pricePackage.findFirst({
      where: { id, deletedAt: null },
    });

    if (!pkg) {
      throw new NotFoundException('Gói mẫu không tồn tại');
    }

    return PackageEntity.from(pkg);
  }

  async create(dto: CreatePackageDto): Promise<PackageEntity> {
    this.assertValidDateRange(dto.validFrom, dto.validTo);

    // Check for existing package with same code (resurrection path)
    const existing = await this.prisma.pricePackage.findUnique({
      where: { code: dto.code },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Mã gói mẫu đã tồn tại');
    }

    try {
      const pkg = existing
        ? // Resurrect soft-deleted package
          await this.prisma.pricePackage.update({
            where: { id: existing.id },
            data: {
              name: dto.name,
              applyType: dto.applyType,
              numNights: dto.numNights,
              numGuests: dto.numGuests,
              totalPrice: dto.totalPrice,
              validFrom: new Date(dto.validFrom),
              validTo: new Date(dto.validTo),
              detail: dto.detail ?? null,
              active: dto.active ?? true,
              deletedAt: null,
            },
          })
        : await this.prisma.pricePackage.create({
            data: {
              code: dto.code,
              name: dto.name,
              applyType: dto.applyType,
              numNights: dto.numNights,
              numGuests: dto.numGuests,
              totalPrice: dto.totalPrice,
              validFrom: new Date(dto.validFrom),
              validTo: new Date(dto.validTo),
              detail: dto.detail ?? null,
              active: dto.active ?? true,
            },
          });

      return PackageEntity.from(pkg);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã gói mẫu đã tồn tại');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePackageDto): Promise<PackageEntity> {
    const existing = await this.prisma.pricePackage.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Gói mẫu không tồn tại');
    }

    // Validate date range only when both fields are involved (either being updated or kept from existing)
    const validFrom = dto.validFrom ?? existing.validFrom.toISOString().split('T')[0];
    const validTo = dto.validTo ?? existing.validTo.toISOString().split('T')[0];
    if (validFrom !== undefined && validTo !== undefined) {
      this.assertValidDateRange(validFrom, validTo);
    }

    try {
      const pkg = await this.prisma.pricePackage.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.applyType !== undefined ? { applyType: dto.applyType } : {}),
          ...(dto.numNights !== undefined ? { numNights: dto.numNights } : {}),
          ...(dto.numGuests !== undefined ? { numGuests: dto.numGuests } : {}),
          ...(dto.totalPrice !== undefined ? { totalPrice: dto.totalPrice } : {}),
          ...(dto.validFrom !== undefined ? { validFrom: new Date(dto.validFrom) } : {}),
          ...(dto.validTo !== undefined ? { validTo: new Date(dto.validTo) } : {}),
          ...('detail' in dto ? { detail: dto.detail ?? null } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });

      return PackageEntity.from(pkg);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã gói mẫu đã tồn tại');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.pricePackage.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Gói mẫu không tồn tại');
    }

    await this.prisma.pricePackage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
