import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@prisma/client';

import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingEntity } from './entities/setting.entity';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST, UserRole.HOUSEKEEPING)
  @ApiOperation({ summary: 'Lấy cài đặt cơ sở' })
  @ApiResponse({ status: 200, description: 'Cài đặt hiện tại', type: SettingEntity })
  async get(): Promise<{ data: SettingEntity }> {
    const setting = await this.settingsService.get();
    return { data: setting };
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cập nhật cài đặt cơ sở' })
  @ApiResponse({ status: 200, description: 'Cài đặt đã cập nhật', type: SettingEntity })
  async update(@Body() dto: UpdateSettingsDto): Promise<{ data: SettingEntity }> {
    const setting = await this.settingsService.update(dto);
    return { data: setting };
  }
}
