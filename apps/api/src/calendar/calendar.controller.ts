import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CalendarService } from './calendar.service';
import { QueryCalendarDto } from './dto/query-calendar.dto';
import { CalendarResponse, CalendarResponseEntity } from './entities/calendar.entity';

const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING];

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Lịch booking theo tháng/tuần/ngày + filter' })
  @ApiResponse({ status: 200, description: 'Dữ liệu lịch booking', type: CalendarResponseEntity })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 422, description: 'to phải sau from' })
  async getCalendar(@Query() query: QueryCalendarDto): Promise<{ data: CalendarResponse }> {
    const data = await this.calendarService.getCalendar(query);
    return { data };
  }
}
