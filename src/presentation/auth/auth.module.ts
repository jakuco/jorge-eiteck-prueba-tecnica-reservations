import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  LoginUseCase,
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/use-cases/auth/login.use-case';
import { RefreshTokenUseCase } from '../../domain/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from '../../domain/use-cases/auth/logout.use-case';
import { DrizzleUserRepository } from '../../data/repositories/drizzle-user.repository';
import { DrizzleRefreshTokenRepository } from '../../data/repositories/drizzle-refresh-token.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') ?? '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: DrizzleRefreshTokenRepository,
    },
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
