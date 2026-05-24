import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING)
  @ApiOperation({
    summary: 'Get dashboard aggregated data',
    description:
      'Returns aggregated KPI + tab-specific analytics for the specified date range. All roles allowed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Validation error (invalid date or tab)' })
  @ApiResponse({ status: 422, description: 'from must be before to' })
  async getDashboard(@Query() query: QueryDashboardDto) {
    const data = await this.dashboardService.getDashboard(query);
    return { data };
  }
}
