import { LogoutUseCase } from './logout.use-case';
import { RefreshToken } from '../../entities/refresh-token.entity';
import {
  IRefreshTokenRepository,
  NewRefreshTokenData,
  RotateResult,
} from '../../repositories/refresh-token.repository.interface';
import { hashRefreshToken } from '../../helpers/refresh-token';

class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  stored: RefreshToken | null = null;
  revokedHashes: string[] = [];

  async create(
    _userId: number,
    _data: NewRefreshTokenData,
  ): Promise<RefreshToken> {
    throw new Error('no usado en este test');
  }

  async findByHash(hash: string): Promise<RefreshToken | null> {
    return this.stored && this.stored.tokenHash === hash ? this.stored : null;
  }

  async rotate(
    _oldHash: string,
    _data: NewRefreshTokenData,
    _now: Date,
  ): Promise<RotateResult> {
    throw new Error('no usado en este test');
  }

  async revokeByHash(hash: string): Promise<boolean> {
    this.revokedHashes.push(hash);
    return true;
  }

  async revokeAllForUser(): Promise<void> {
    throw new Error('no usado en este test');
  }
}

function tokenFor(userId: number, raw: string): RefreshToken {
  return new RefreshToken(
    1,
    userId,
    hashRefreshToken(raw),
    new Date(Date.now() + 86_400_000),
    null,
    null,
    new Date(),
  );
}

describe('LogoutUseCase', () => {
  it('revoca el refresh token del propio usuario', async () => {
    const raw = 'raw-token-1';
    const repo = new FakeRefreshTokenRepository();
    repo.stored = tokenFor(7, raw);

    await new LogoutUseCase(repo).execute({ refreshToken: raw, userId: 7 });

    expect(repo.revokedHashes).toEqual([hashRefreshToken(raw)]);
  });

  it('no revoca tokens de otro usuario', async () => {
    const raw = 'raw-token-2';
    const repo = new FakeRefreshTokenRepository();
    repo.stored = tokenFor(99, raw);

    await new LogoutUseCase(repo).execute({ refreshToken: raw, userId: 7 });

    expect(repo.revokedHashes).toEqual([]);
  });

  it('es idempotente si el token no existe', async () => {
    const repo = new FakeRefreshTokenRepository();
    await expect(
      new LogoutUseCase(repo).execute({ refreshToken: 'nope', userId: 7 }),
    ).resolves.toBeUndefined();
    expect(repo.revokedHashes).toEqual([]);
  });
});
