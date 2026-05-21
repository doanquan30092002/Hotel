import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/paginated.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        status: dto.status,
        avatarUrl: dto.avatarUrl,
      },
    });

    return UserEntity.from(user);
  }

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { email: { contains: query.keyword, mode: 'insensitive' } },
              { fullName: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(users.map(UserEntity.from), total, page, pageSize);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return UserEntity.from(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    await this.findOne(id); // throws 404 if not found

    const data: Prisma.UserUpdateInput = {
      ...(dto.fullName ? { fullName: dto.fullName } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
    };

    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    const updated = await this.prisma.user.update({ where: { id }, data });
    return UserEntity.from(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // throws 404 if not found

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
