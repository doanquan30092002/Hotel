import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export enum CalendarView {
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
}

export class QueryCalendarDto {
  @IsISO8601({ strict: true }, { message: 'from phải đúng định dạng ngày YYYY-MM-DD' })
  from!: string;

  @IsISO8601({ strict: true }, { message: 'to phải đúng định dạng ngày YYYY-MM-DD' })
  to!: string;

  @IsOptional()
  @IsEnum(CalendarView, { message: 'view phải là month | week | day' })
  view?: CalendarView = CalendarView.MONTH;

  @IsOptional() @IsString() typeId?: string;
  @IsOptional() @IsString() statusId?: string;
  @IsOptional() @IsString() sourceId?: string;
  @IsOptional() @IsString() keyword?: string;
}
