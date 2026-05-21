import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '../../users/entities/user.entity';

export class AuthTokensEntity {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: () => UserEntity }) user!: UserEntity;
}

export class AccessTokenEntity {
  @ApiProperty() accessToken!: string;
}
