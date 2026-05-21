// Room types — mirror BE RoomEntity + DTOs

export type CategoryRef = {
  id: string;
  code: string;
  name: string;
};

export type Room = {
  id: string;
  code: string;
  name: string;
  typeId: string;
  type: CategoryRef;
  areaId: string | null;
  area: CategoryRef | null;
  capacity: number;
  basePrice: string; // Decimal as string
  weekendPrice: string | null;
  holidayPrice: string | null;
  statusId: string;
  status: CategoryRef;
  cleaningStatusId: string;
  cleaningStatus: CategoryRef;
  defaultCheckIn: string | null;
  defaultCheckOut: string | null;
  images: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomQuery = {
  typeId?: string;
  statusId?: string;
  cleaningStatusId?: string;
  areaId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type CreateRoomInput = {
  code: string;
  name: string;
  typeId: string;
  areaId?: string;
  capacity: number;
  basePrice: number;
  weekendPrice?: number;
  holidayPrice?: number;
  statusId: string;
  cleaningStatusId: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  images?: string[];
  note?: string;
};

export type UpdateRoomInput = Partial<Omit<CreateRoomInput, 'code'>>;

export type ChangeStatusInput = {
  statusId: string;
};

export type ChangeCleaningInput = {
  cleaningStatusId: string;
};
