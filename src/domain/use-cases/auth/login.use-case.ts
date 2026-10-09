import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../repositories/user.repository.interface';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.interface';
import {
  generateRefreshToken,
  hashRefreshToken,
} from '../../helpers/refresh-token';
import { signAccessToken } from './access-token';
import { AuthTokens } from './auth-tokens';

export const USER_REPOSITORY = Symbol('IUserRepository');
export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshRepo: IRefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: LoginInput): Promise<AuthTokens> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { token: accessToken, expiresIn } = signAccessToken(this.jwt, {
      sub: user.id,
      email: user.email,
      roleName: user.role.name,
      roleId: user.role.id,
    });

    const ttlDays = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS') ?? 7;
    const rawRefreshToken = generateRefreshToken();
    await this.refreshRepo.create(user.id, {
      tokenHash: hashRefreshToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_expires_in: ttlDays * 86_400,
      user: { id: user.id, email: user.email, roleName: user.role.name },
    };
  }
}
