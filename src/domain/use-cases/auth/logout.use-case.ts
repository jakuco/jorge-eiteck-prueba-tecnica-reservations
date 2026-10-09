import { Inject, Injectable } from '@nestjs/common';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.interface';
import { hashRefreshToken } from '../../helpers/refresh-token';
import { REFRESH_TOKEN_REPOSITORY } from './login.use-case';

export interface LogoutInput {
  refreshToken: string;
  userId: number;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshRepo: IRefreshTokenRepository,
  ) {}

  /**
   * Revoca el refresh token presentado, solo si pertenece al usuario
   * autenticado. Idempotente: si ya estaba revocado o no existe, no falla
   * (no se filtra si un token existía o no).
   */
  async execute(input: LogoutInput): Promise<void> {
    const hash = hashRefreshToken(input.refreshToken);
    const token = await this.refreshRepo.findByHash(hash);
    if (token && token.userId === input.userId) {
      await this.refreshRepo.revokeByHash(hash, new Date());
    }
  }
}
