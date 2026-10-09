import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Ip,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginUseCase } from '../../domain/use-cases/auth/login.use-case';
import { RefreshTokenUseCase } from '../../domain/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from '../../domain/use-cases/auth/logout.use-case';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión y obtener access + refresh token' })
  @ApiResponse({ status: 200, description: 'Login exitoso, devuelve tokens' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos, intentar más tarde' })
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.loginUseCase.execute({ ...dto, userAgent, ip });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Renovar access token con un refresh token (rotación)',
    description:
      'Consume el refresh token y emite un par nuevo. Reutilizar un refresh ya consumido revoca todas las sesiones del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido, expirado o reutilizado' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos, intentar más tarde' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent?: string,
    @Ip() ip?: string,
  ) {
    return this.refreshTokenUseCase.execute({
      refreshToken: dto.refresh_token,
      userAgent,
      ip,
    });
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cerrar sesión (revocar el refresh token)',
    description:
      'Revoca el refresh token presentado. Solo actúa sobre tokens del usuario autenticado. Idempotente.',
  })
  @ApiResponse({ status: 204, description: 'Sesión finalizada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.logoutUseCase.execute({
      refreshToken: dto.refresh_token,
      userId: user.sub,
    });
  }
}
