import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingEntity } from './entities/setting.entity';

const SINGLETON_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SettingEntity> {
    let setting = await this.prisma.setting.findUnique({ where: { id: SINGLETON_ID } });

    if (!setting) {
      // Defensive: seed should have created it, but create if missing
      setting = await this.prisma.setting.create({
        data: { id: SINGLETON_ID, propertyName: 'Khách sạn', themeTone: 2 },
      });
    }

    return SettingEntity.from(setting);
  }

  async update(dto: UpdateSettingsDto): Promise<SettingEntity> {
    // Ensure singleton exists
    await this.get();

    const updated = await this.prisma.setting.update({
      where: { id: SINGLETON_ID },
      data: {
        ...(dto.propertyName !== undefined ? { propertyName: dto.propertyName } : {}),
        ...(dto.taxCode !== undefined ? { taxCode: dto.taxCode } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.hotline !== undefined ? { hotline: dto.hotline } : {}),
        ...(dto.themeTone !== undefined ? { themeTone: dto.themeTone } : {}),
        ...(dto.monthlyRevenueTarget !== undefined
          ? { monthlyRevenueTarget: dto.monthlyRevenueTarget }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
    });

    return SettingEntity.from(updated);
  }
}
