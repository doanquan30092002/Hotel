// Housekeeping domain types — mirror BE DTOs

export type HousekeepingPriority = 'high' | 'normal' | 'low';

export interface HousekeepingTask {
  id: string;
  code: string;
  room: { id: string; code: string; name: string };
  booking: { id: string; code: string } | null;
  status: { id: string; code: string; name: string };
  assignee: { id: string; fullName: string; role: string } | null;
  priority: HousekeepingPriority;
  description: string;
  scheduledAt: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  completedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HousekeepingListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  statusId?: string;
  roomId?: string;
  assigneeId?: string;
  priority?: HousekeepingPriority;
  from?: string;
  to?: string;
}

export interface CreateHousekeepingTaskInput {
  roomId: string;
  bookingId?: string | null;
  statusId: string;
  assigneeId?: string | null;
  priority: HousekeepingPriority;
  description: string;
  scheduledAt: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

export type UpdateHousekeepingTaskInput = Partial<CreateHousekeepingTaskInput>;
