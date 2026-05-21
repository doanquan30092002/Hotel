import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../users/entities/user.entity';
import { AuthTokensEntity, AccessTokenEntity } from './entities/auth-tokens.entity';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  typ: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email.toLowerCase(), mode: 'insensitive' },
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);

    if (!passwordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return UserEntity.from(user);
  }

  async login(user: UserEntity): Promise<AuthTokensEntity> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, typ: 'access' };
    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      typ: 'refresh',
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
    });

    return { accessToken, refreshToken, user };
  }

  async refresh(refreshToken: string): Promise<AccessTokenEntity> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị vô hiệu hoá');
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      typ: 'access',
    };

    return { accessToken: this.jwtService.sign(newPayload) };
  }

  async me(userId: string): Promise<UserEntity> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    return UserEntity.from(user);
  }
}
