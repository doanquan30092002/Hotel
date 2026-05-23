import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignDto } from './dto/assign.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { QueryHousekeepingTaskDto } from './dto/query-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import { HousekeepingTaskEntity } from './entities/housekeeping-task.entity';

// ── include constant ───────────────────────────────────────────────────────────

const TASK_INCLUDE = {
  room: { select: { id: true, code: true, name: true } },
  booking: { select: { id: true, code: true } },
  status: { select: { id: true, code: true, name: true } },
  assignee: { select: { id: true, fullName: true, role: true } },
} as const;

// Code for "done" status in HOUSEKEEPING_TASK_STATUS
const DONE_STATUS_CODE = 'done';

@Injectable()
export class HousekeepingService {
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

  private async assertRoomExists(roomId: string): Promise<void> {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true },
    });
    if (!room) {
      throw new BadRequestException('roomId không tìm thấy phòng tương ứng');
    }
  }

  private async assertBookingExists(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { id: true },
    });
    if (!booking) {
      throw new BadRequestException('bookingId không tìm thấy booking tương ứng');
    }
  }

  private async assertUserExists(assigneeId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: assigneeId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('assigneeId không tìm thấy người dùng tương ứng');
    }
  }

  /**
   * Generate next task code: DP001, DP002, ...
   */
  private async nextCode(): Promise<string> {
    const count = await this.prisma.housekeepingTask.count({ where: { deletedAt: null } });
    const candidate = `DP${String(count + 1).padStart(3, '0')}`;

    const exists = await this.prisma.housekeepingTask.findUnique({ where: { code: candidate } });
    if (!exists) return candidate;

    // Fallback: find max numeric code and increment
    const last = await this.prisma.housekeepingTask.findFirst({
      where: { code: { startsWith: 'DP' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    if (!last) return candidate;
    const num = parseInt(last.code.replace('DP', ''), 10);
    return `DP${String(num + 1).padStart(3, '0')}`;
  }

  /**
   * Get the ID of the "done" status category.
   */
  private async getDoneStatusId(): Promise<string | null> {
    const cat = await this.prisma.category.findFirst({
      where: {
        group: CategoryGroup.HOUSEKEEPING_TASK_STATUS,
        code: DONE_STATUS_CODE,
        deletedAt: null,
      },
      select: { id: true },
    });
    return cat?.id ?? null;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryHousekeepingTaskDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.HousekeepingTaskWhereInput = {
      deletedAt: null,
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.from || query.to
        ? {
            scheduledAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { description: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.housekeepingTask.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        include: TASK_INCLUDE,
      }),
      this.prisma.housekeepingTask.count({ where }),
    ]);

    return paginate(rows.map(HousekeepingTaskEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<HousekeepingTaskEntity> {
    const task = await this.prisma.housekeepingTask.findFirst({
      where: { id, deletedAt: null },
      include: TASK_INCLUDE,
    });

    if (!task) {
      throw new NotFoundException('Công việc dọn phòng không tồn tại');
    }

    return HousekeepingTaskEntity.from(task);
  }

  async create(dto: CreateHousekeepingTaskDto): Promise<HousekeepingTaskEntity> {
    // Validate FK
    await this.assertRoomExists(dto.roomId);
    if (dto.bookingId) {
      await this.assertBookingExists(dto.bookingId);
    }
    await this.assertCategoryGroup(
      dto.statusId,
      CategoryGroup.HOUSEKEEPING_TASK_STATUS,
      'statusId',
    );
    if (dto.assigneeId) {
      await this.assertUserExists(dto.assigneeId);
    }

    const code = await this.nextCode();

    const task = await this.prisma.housekeepingTask.create({
      data: {
        code,
        roomId: dto.roomId,
        bookingId: dto.bookingId ?? null,
        statusId: dto.statusId,
        assigneeId: dto.assigneeId ?? null,
        priority: dto.priority ?? 'normal',
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        note: dto.note ?? null,
      },
      include: TASK_INCLUDE,
    });

    return HousekeepingTaskEntity.from(task);
  }

  async update(id: string, dto: UpdateHousekeepingTaskDto): Promise<HousekeepingTaskEntity> {
    const existing = await this.prisma.housekeepingTask.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Công việc dọn phòng không tồn tại');
    }

    // Validate FK if provided
    if (dto.roomId !== undefined) {
      await this.assertRoomExists(dto.roomId);
    }
    if (dto.bookingId !== undefined && dto.bookingId !== null) {
      await this.assertBookingExists(dto.bookingId);
    }
    if (dto.statusId !== undefined) {
      await this.assertCategoryGroup(
        dto.statusId,
        CategoryGroup.HOUSEKEEPING_TASK_STATUS,
        'statusId',
      );
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.assertUserExists(dto.assigneeId);
    }

    // Determine if status is flipping to done
    let completedAt: Date | undefined | null = undefined;
    if (dto.statusId !== undefined) {
      const doneId = await this.getDoneStatusId();
      if (doneId && dto.statusId === doneId && !existing.completedAt) {
        completedAt = new Date();
      }
    }

    await this.prisma.housekeepingTask.update({
      where: { id },
      data: {
        ...(dto.roomId !== undefined ? { roomId: dto.roomId } : {}),
        ...('bookingId' in dto ? { bookingId: dto.bookingId ?? null } : {}),
        ...(dto.statusId !== undefined ? { statusId: dto.statusId } : {}),
        ...('assigneeId' in dto ? { assigneeId: dto.assigneeId ?? null } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
        ...('note' in dto ? { note: dto.note ?? null } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    });

    return this.findOne(id);
  }

  async changeStatus(id: string, dto: ChangeStatusDto): Promise<HousekeepingTaskEntity> {
    const existing = await this.prisma.housekeepingTask.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Công việc dọn phòng không tồn tại');
    }

    await this.assertCategoryGroup(
      dto.statusId,
      CategoryGroup.HOUSEKEEPING_TASK_STATUS,
      'statusId',
    );

    // Auto-set completedAt when flipping to done
    const doneId = await this.getDoneStatusId();
    const completedAt =
      doneId && dto.statusId === doneId && !existing.completedAt ? new Date() : undefined;

    await this.prisma.housekeepingTask.update({
      where: { id },
      data: {
        statusId: dto.statusId,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    });

    return this.findOne(id);
  }

  async assign(id: string, dto: AssignDto): Promise<HousekeepingTaskEntity> {
    const existing = await this.prisma.housekeepingTask.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Công việc dọn phòng không tồn tại');
    }

    if (dto.assigneeId !== null && dto.assigneeId !== undefined) {
      await this.assertUserExists(dto.assigneeId);
    }

    await this.prisma.housekeepingTask.update({
      where: { id },
      data: { assigneeId: dto.assigneeId ?? null },
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.housekeepingTask.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Công việc dọn phòng không tồn tại');
    }

    await this.prisma.housekeepingTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
