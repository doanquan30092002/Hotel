import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { BookingItemKind, CategoryGroup, Prisma } from '@prisma/client';

import { paginate } from '../common/dto/paginated.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeCleaningDto } from './dto/change-cleaning.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryAvailableRoomDto } from './dto/query-available-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomEntity } from './entities/room.entity';

const ROOM_INCLUDE = {
  type: { select: { id: true, code: true, name: true } },
  area: { select: { id: true, code: true, name: true } },
  status: { select: { id: true, code: true, name: true } },
  cleaningStatus: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class RoomsService {
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

  private async validateRoomDto(
    dto: CreateRoomDto | UpdateRoomDto,
    partial = false,
  ): Promise<void> {
    if (!partial || dto.typeId !== undefined) {
      await this.assertCategoryGroup(dto.typeId!, CategoryGroup.ROOM_TYPE, 'typeId');
    }
    if (dto.areaId !== undefined && dto.areaId !== null) {
      await this.assertCategoryGroup(dto.areaId, CategoryGroup.ROOM_AREA, 'areaId');
    }
    if (!partial || dto.statusId !== undefined) {
      await this.assertCategoryGroup(dto.statusId!, CategoryGroup.ROOM_STATUS, 'statusId');
    }
    if (!partial || dto.cleaningStatusId !== undefined) {
      await this.assertCategoryGroup(
        dto.cleaningStatusId!,
        CategoryGroup.CLEANING_STATUS,
        'cleaningStatusId',
      );
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async list(query: QueryRoomDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RoomWhereInput = {
      deletedAt: null,
      ...(query.typeId !== undefined ? { typeId: query.typeId } : {}),
      ...(query.statusId !== undefined ? { statusId: query.statusId } : {}),
      ...(query.cleaningStatusId !== undefined ? { cleaningStatusId: query.cleaningStatusId } : {}),
      ...(query.areaId !== undefined ? { areaId: query.areaId } : {}),
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
      this.prisma.room.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ code: 'asc' }],
        include: ROOM_INCLUDE,
      }),
      this.prisma.room.count({ where }),
    ]);

    return paginate(rows.map(RoomEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<RoomEntity> {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: ROOM_INCLUDE,
    });

    if (!room) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    return RoomEntity.from(room);
  }

  async create(dto: CreateRoomDto): Promise<RoomEntity> {
    await this.validateRoomDto(dto, false);

    // Check for existing room with same code (including soft-deleted)
    const existing = await this.prisma.room.findUnique({
      where: { code: dto.code },
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Mã phòng đã tồn tại');
    }

    try {
      const room = existing
        ? // Resurrect soft-deleted room
          await this.prisma.room.update({
            where: { id: existing.id },
            data: {
              name: dto.name,
              typeId: dto.typeId,
              areaId: dto.areaId ?? null,
              capacity: dto.capacity ?? 2,
              basePrice: dto.basePrice,
              weekendPrice: dto.weekendPrice ?? null,
              holidayPrice: dto.holidayPrice ?? null,
              statusId: dto.statusId,
              cleaningStatusId: dto.cleaningStatusId,
              defaultCheckIn: dto.defaultCheckIn ?? null,
              defaultCheckOut: dto.defaultCheckOut ?? null,
              images: dto.images ?? [],
              note: dto.note ?? null,
              deletedAt: null,
            },
            include: ROOM_INCLUDE,
          })
        : await this.prisma.room.create({
            data: {
              code: dto.code,
              name: dto.name,
              typeId: dto.typeId,
              areaId: dto.areaId ?? null,
              capacity: dto.capacity ?? 2,
              basePrice: dto.basePrice,
              weekendPrice: dto.weekendPrice ?? null,
              holidayPrice: dto.holidayPrice ?? null,
              statusId: dto.statusId,
              cleaningStatusId: dto.cleaningStatusId,
              defaultCheckIn: dto.defaultCheckIn ?? null,
              defaultCheckOut: dto.defaultCheckOut ?? null,
              images: dto.images ?? [],
              note: dto.note ?? null,
            },
            include: ROOM_INCLUDE,
          });

      return RoomEntity.from(room);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã phòng đã tồn tại');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomEntity> {
    const existing = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    await this.validateRoomDto(dto, true);

    // Check code uniqueness if code is being changed
    if (dto.code !== undefined && dto.code !== existing.code) {
      const codeConflict = await this.prisma.room.findUnique({
        where: { code: dto.code },
      });
      if (codeConflict && codeConflict.deletedAt === null) {
        throw new ConflictException('Mã phòng đã tồn tại');
      }
    }

    try {
      const room = await this.prisma.room.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.typeId !== undefined ? { typeId: dto.typeId } : {}),
          ...('areaId' in dto ? { areaId: dto.areaId ?? null } : {}),
          ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
          ...('weekendPrice' in dto ? { weekendPrice: dto.weekendPrice ?? null } : {}),
          ...('holidayPrice' in dto ? { holidayPrice: dto.holidayPrice ?? null } : {}),
          ...(dto.statusId !== undefined ? { statusId: dto.statusId } : {}),
          ...(dto.cleaningStatusId !== undefined ? { cleaningStatusId: dto.cleaningStatusId } : {}),
          ...('defaultCheckIn' in dto ? { defaultCheckIn: dto.defaultCheckIn ?? null } : {}),
          ...('defaultCheckOut' in dto ? { defaultCheckOut: dto.defaultCheckOut ?? null } : {}),
          ...(dto.images !== undefined ? { images: dto.images } : {}),
          ...('note' in dto ? { note: dto.note ?? null } : {}),
        },
        include: ROOM_INCLUDE,
      });

      return RoomEntity.from(room);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Mã phòng đã tồn tại');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Status flips ─────────────────────────────────────────────────────────────

  async changeStatus(id: string, dto: ChangeStatusDto): Promise<RoomEntity> {
    const existing = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    await this.assertCategoryGroup(dto.statusId, CategoryGroup.ROOM_STATUS, 'statusId');

    const room = await this.prisma.room.update({
      where: { id },
      data: { statusId: dto.statusId },
      include: ROOM_INCLUDE,
    });

    return RoomEntity.from(room);
  }

  async changeCleaning(id: string, dto: ChangeCleaningDto): Promise<RoomEntity> {
    const existing = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Phòng không tồn tại');
    }

    await this.assertCategoryGroup(
      dto.cleaningStatusId,
      CategoryGroup.CLEANING_STATUS,
      'cleaningStatusId',
    );

    const room = await this.prisma.room.update({
      where: { id },
      data: { cleaningStatusId: dto.cleaningStatusId },
      include: ROOM_INCLUDE,
    });

    return RoomEntity.from(room);
  }

  // ── Available rooms ──────────────────────────────────────────────────────────

  async listAvailable(query: QueryAvailableRoomDto) {
    const checkIn = new Date(query.checkIn);
    const checkOut = new Date(query.checkOut);

    if (checkIn >= checkOut) {
      throw new UnprocessableEntityException('checkOut phải sau checkIn');
    }

    // Get all rooms matching optional filters; exclude rooms with status='disabled'
    const allRooms = await this.prisma.room.findMany({
      where: {
        deletedAt: null,
        status: { code: { not: 'disabled' } },
        ...(query.typeId !== undefined ? { typeId: query.typeId } : {}),
        ...(query.capacity !== undefined ? { capacity: { gte: query.capacity } } : {}),
        ...(query.keyword
          ? {
              OR: [
                { code: { contains: query.keyword, mode: 'insensitive' } },
                { name: { contains: query.keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: ROOM_INCLUDE,
      orderBy: { code: 'asc' },
    });

    // Fetch non-blocking booking status ids (cancelled + checked_out)
    const nonBlockingStatuses = await this.prisma.category.findMany({
      where: {
        group: CategoryGroup.BOOKING_STATUS,
        code: { in: ['cancelled', 'checked_out'] },
        deletedAt: null,
      },
      select: { id: true },
    });
    const nonBlockingIds = nonBlockingStatuses.map((s) => s.id);

    // Find all bookings that overlap the requested range and are blocking
    const blockingBookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        statusId: { notIn: nonBlockingIds },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: {
        items: {
          where: {
            kind: BookingItemKind.ROOM,
            roomId: { not: null },
          },
          select: { roomId: true },
        },
      },
    });

    // Build set of blocked room IDs
    const blockedRoomIds = new Set<string>();
    for (const booking of blockingBookings) {
      for (const item of booking.items) {
        if (item.roomId !== null) {
          blockedRoomIds.add(item.roomId);
        }
      }
    }

    const availableRooms = allRooms.filter((r) => !blockedRoomIds.has(r.id));
    const bookedCount = allRooms.filter((r) => blockedRoomIds.has(r.id)).length;

    return {
      data: availableRooms.map(RoomEntity.from),
      meta: {
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        totalRooms: allRooms.length,
        totalAvailable: availableRooms.length,
        totalBooked: bookedCount,
      },
    };
  }
}
