export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarRoom {
  id: string;
  code: string;
  name: string;
  type: { id: string; code: string; name: string };
  area: { id: string; code: string; name: string } | null;
}

export interface CalendarBookingRoom {
  roomId: string;
  roomCode: string;
  roomName: string;
}

export interface CalendarBooking {
  id: string;
  code: string;
  status: { id: string; code: string; name: string };
  source: { id: string; code: string; name: string } | null;
  customer: { id: string; code: string; fullName: string; phone: string | null } | null;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  checkInTime: string | null;
  checkOutTime: string | null;
  rooms: CalendarBookingRoom[];
}

export interface CalendarStats {
  totalBookings: number;
  occupancyPercent: number;
  relatedShifts: number;
}

export interface CalendarResponse {
  view: CalendarView;
  from: string;
  to: string;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  stats: CalendarStats;
}

export interface CalendarQuery {
  from: string;
  to: string;
  view?: CalendarView;
  typeId?: string;
  statusId?: string;
  sourceId?: string;
  keyword?: string;
}
