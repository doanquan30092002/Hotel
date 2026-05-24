import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { QueryReportDto, QueryReportExportDto, ReportFormat } from './dto/query-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @ApiOperation({ summary: 'Get aggregated business report summary' })
  @ApiResponse({ status: 200, description: 'Report summary returned successfully.' })
  @ApiResponse({ status: 400, description: 'Missing required parameters.' })
  @ApiResponse({ status: 422, description: 'to must be after from.' })
  async getSummary(@Query() query: QueryReportDto) {
    return this.reportsService.getSummary(query);
  }

  @Get('export')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export report as XLSX or CSV file' })
  @ApiResponse({ status: 200, description: 'File streamed successfully.' })
  @ApiResponse({ status: 400, description: 'Missing required parameters.' })
  @ApiResponse({ status: 422, description: 'to must be after from.' })
  async exportReport(
    @Query() query: QueryReportExportDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const fmt = query.format ?? ReportFormat.XLSX;

    if (fmt === ReportFormat.CSV) {
      const buffer = await this.reportsService.generateCsv(query);
      const filename = `report-${query.from}-to-${query.to}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
      return;
    }

    const buffer = await this.reportsService.generateXlsx(query);
    const filename = `report-${query.from}-to-${query.to}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
