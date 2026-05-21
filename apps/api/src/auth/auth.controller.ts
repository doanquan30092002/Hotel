import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AccessTokenEntity, AuthTokensEntity } from './entities/auth-tokens.entity';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập, nhận access + refresh token' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công', type: AuthTokensEntity })
  @ApiResponse({ status: 401, description: 'Sai thông tin đăng nhập' })
  async login(@Body() dto: LoginDto): Promise<{ data: AuthTokensEntity }> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const tokens = await this.authService.login(user);
    return { data: tokens };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiResponse({ status: 200, description: 'Token mới', type: AccessTokenEntity })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ' })
  async refresh(@Body() dto: RefreshDto): Promise<{ data: AccessTokenEntity }> {
    const result = await this.authService.refresh(dto.refreshToken);
    return { data: result };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin user', type: UserEntity })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async me(@CurrentUser() user: JwtPayloadUser): Promise<{ data: UserEntity }> {
    const userEntity = await this.authService.me(user.id);
    return { data: userEntity };
  }
}
