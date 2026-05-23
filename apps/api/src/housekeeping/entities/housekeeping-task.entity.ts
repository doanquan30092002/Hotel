import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

interface RoomRef {
  id: string;
  code: string;
  name: string;
}

interface BookingRef {
  id: string;
  code: string;
}

interface StatusRef {
  id: string;
  code: string;
  name: string;
}

interface AssigneeRef {
  id: string;
  fullName: string;
  role: string;
}

// Shape returned by Prisma includes
interface HousekeepingTaskRow {
  id: string;
  code: string;
  room: RoomRef;
  booking: BookingRef | null;
  status: StatusRef;
  assignee: AssigneeRef | null;
  priority: string;
  description: string;
  scheduledAt: Date;
  startTime: string | null;
  endTime: string | null;
  completedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class HousekeepingTaskEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  room!: RoomRef;

  @ApiPropertyOptional({ nullable: true })
  booking!: BookingRef | null;

  @ApiProperty()
  status!: StatusRef;

  @ApiPropertyOptional({ nullable: true })
  assignee!: AssigneeRef | null;

  @ApiProperty({ enum: ['high', 'normal', 'low'] })
  priority!: 'high' | 'normal' | 'low';

  @ApiProperty()
  description!: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  scheduledAt!: string;

  @ApiPropertyOptional({ nullable: true })
  startTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  endTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  static from(t: HousekeepingTaskRow): HousekeepingTaskEntity {
    const e = new HousekeepingTaskEntity();
    e.id = t.id;
    e.code = t.code;
    e.room = t.room;
    e.booking = t.booking;
    e.status = t.status;
    e.assignee = t.assignee;
    e.priority = t.priority as 'high' | 'normal' | 'low';
    e.description = t.description;
    e.scheduledAt = t.scheduledAt.toISOString().slice(0, 10);
    e.startTime = t.startTime;
    e.endTime = t.endTime;
    e.completedAt = t.completedAt ? t.completedAt.toISOString() : null;
    e.note = t.note;
    e.createdAt = t.createdAt.toISOString();
    e.updatedAt = t.updatedAt.toISOString();
    return e;
  }
}
