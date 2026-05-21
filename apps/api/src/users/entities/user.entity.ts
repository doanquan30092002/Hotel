import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

// Prisma User shape (only what we need — avoids importing the full generated type)
interface PrismaUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class UserEntity {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt!: Date | null;

  static from(u: PrismaUser): UserEntity {
    const entity = new UserEntity();
    entity.id = u.id;
    entity.email = u.email;
    entity.fullName = u.fullName;
    entity.role = u.role;
    entity.status = u.status;
    entity.avatarUrl = u.avatarUrl;
    entity.createdAt = u.createdAt;
    entity.updatedAt = u.updatedAt;
    entity.deletedAt = u.deletedAt;
    return entity;
  }
}
