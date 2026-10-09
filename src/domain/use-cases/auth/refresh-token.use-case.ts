import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '../../repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.interface';
import {
  generateRefreshToken,
  hashRefreshToken,
} from '../../helpers/refresh-token';
import { signAccessToken } from './access-token';
import { AuthTokens } from './auth-tokens';
import { REFRESH_TOKEN_REPOSITORY, USER_REPOSITORY } from './login.use-case';

export interface RefreshInput {
  refreshToken: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshRepo: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: RefreshInput): Promise<AuthTokens> {
    const now = new Date();
    const ttlDays = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS') ?? 7;
    const rawNewToken = generateRefreshToken();
    const newHash = hashRefreshToken(rawNewToken);

    const result = await this.refreshRepo.rotate(
      hashRefreshToken(input.refreshToken),
      {
        tokenHash: newHash,
        expiresAt: new Date(now.getTime() + ttlDays * 86_400_000),
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
      },
      now,
    );

    if (result.status === 'reused') {
      // Token ya consumido reutilizado: posible robo. Se revoca todo.
      await this.refreshRepo.revokeAllForUser(result.userId, now);
      throw new UnauthorizedException(
        'Refresh token reutilizado; sesiones revocadas',
      );
    }

    if (result.status !== 'rotated') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.userRepo.findById(result.token.userId);
    if (!user || !user.isActive) {
      await this.refreshRepo.revokeByHash(newHash, now);
      throw new UnauthorizedException('Usuario no válido');
    }

    const { token: accessToken, expiresIn } = signAccessToken(this.jwt, {
      sub: user.id,
      email: user.email,
      roleName: user.role.name,
      roleId: user.role.id,
    });

    return {
      access_token: accessToken,
      refresh_token: rawNewToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_expires_in: ttlDays * 86_400,
      user: { id: user.id, email: user.email, roleName: user.role.name },
    };
  }
}
