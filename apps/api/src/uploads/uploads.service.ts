import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma, UploadKind } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { QueryUploadDto } from './dto/query-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { UploadEntity } from './entities/upload.entity';

// ── include constant ───────────────────────────────────────────────────────────

const UPLOAD_INCLUDE = {
  uploadedBy: { select: { id: true, fullName: true, role: true } },
} as const;

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── helpers ─────────────────────────────────────────────────────────────────

  /**
   * Generate next upload code: TU001, TU002, ...
   * With collision fallback for soft-deleted gaps.
   */
  private async nextCode(): Promise<string> {
    const count = await this.prisma.upload.count({ where: { deletedAt: null } });
    const candidate = `TU${String(count + 1).padStart(3, '0')}`;

    const exists = await this.prisma.upload.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    // Fallback: find max existing code and increment
    const last = await this.prisma.upload.findFirst({
      where: { code: { startsWith: 'TU' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('TU', ''), 10);
    return `TU${String(num + 1).padStart(3, '0')}`;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryUploadDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UploadWhereInput = {
      deletedAt: null,
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { fileName: { contains: query.keyword, mode: 'insensitive' } },
              { fileId: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.upload.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ code: 'asc' }],
        include: UPLOAD_INCLUDE,
      }),
      this.prisma.upload.count({ where }),
    ]);

    return paginate(rows.map(UploadEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<UploadEntity> {
    const upload = await this.prisma.upload.findFirst({
      where: { id, deletedAt: null },
      include: UPLOAD_INCLUDE,
    });

    if (!upload) {
      throw new NotFoundException('Tệp upload không tồn tại');
    }

    return UploadEntity.from(upload);
  }

  async getStats(): Promise<{ total: number; byKind: Record<string, number> }> {
    const counts = await this.prisma.upload.groupBy({
      by: ['kind'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const byKind: Record<string, number> = Object.fromEntries(
      Object.values(UploadKind).map((k) => [k, 0]),
    );
    for (const c of counts) {
      byKind[c.kind] = c._count._all;
    }
    const total = Object.values(byKind).reduce((a, b) => a + b, 0);
    return { total, byKind };
  }

  async create(dto: CreateUploadDto, uploadedById?: string): Promise<UploadEntity> {
    const code = await this.nextCode();

    const upload = await this.prisma.upload.create({
      data: {
        code,
        kind: dto.kind,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        fileName: dto.fileName,
        fileSize: dto.fileSize ?? 0,
        mimeType: dto.mimeType ?? 'application/octet-stream',
        url: dto.url,
        fileId: dto.fileId ?? null,
        note: dto.note ?? null,
        uploadedById: uploadedById ?? null,
      },
      include: UPLOAD_INCLUDE,
    });

    return UploadEntity.from(upload);
  }

  async update(id: string, dto: UpdateUploadDto): Promise<UploadEntity> {
    const existing = await this.prisma.upload.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Tệp upload không tồn tại');
    }

    await this.prisma.upload.update({
      where: { id },
      data: {
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...('entityType' in dto ? { entityType: dto.entityType ?? null } : {}),
        ...('entityId' in dto ? { entityId: dto.entityId ?? null } : {}),
        ...(dto.fileName !== undefined ? { fileName: dto.fileName } : {}),
        ...(dto.fileSize !== undefined ? { fileSize: dto.fileSize } : {}),
        ...(dto.mimeType !== undefined ? { mimeType: dto.mimeType } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...('fileId' in dto ? { fileId: dto.fileId ?? null } : {}),
        ...('note' in dto ? { note: dto.note ?? null } : {}),
      },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.upload.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Tệp upload không tồn tại');
    }

    await this.prisma.upload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
