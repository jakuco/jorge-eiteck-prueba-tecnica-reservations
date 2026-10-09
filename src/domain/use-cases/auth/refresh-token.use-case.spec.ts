import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import {
  IRefreshTokenRepository,
  NewRefreshTokenData,
  RotateResult,
} from '../../repositories/refresh-token.repository.interface';
import {
  IUserRepository,
  NewUserData,
  UserFilters,
} from '../../repositories/user.repository.interface';
import { PaginatedResult } from '../../pagination';

class FakeRefreshTokenRepository implements IRefreshTokenRepository {
  rotateResult: RotateResult = { status: 'invalid' };
  revokedAllFor: number[] = [];
  revokedHashes: string[] = [];

  async create(
    _userId: number,
    _data: NewRefreshTokenData,
  ): Promise<RefreshToken> {
    throw new Error('no usado');
  }
  async findByHash(): Promise<RefreshToken | null> {
    return null;
  }
  async rotate(): Promise<RotateResult> {
    return this.rotateResult;
  }
  async revokeByHash(hash: string): Promise<boolean> {
    this.revokedHashes.push(hash);
    return true;
  }
  async revokeAllForUser(userId: number): Promise<void> {
    this.revokedAllFor.push(userId);
  }
}

class FakeUserRepository implements IUserRepository {
  constructor(private readonly user: User | null) {}
  async findById(): Promise<User | null> {
    return this.user;
  }
  async findByEmail(): Promise<User | null> {
    return this.user;
  }
  async findMany(): Promise<PaginatedResult<User>> {
    throw new Error('no usado');
  }
  async create(_data: NewUserData): Promise<User> {
    throw new Error('no usado');
  }
}

const jwt = {
  sign: () => 'access.token.value',
  decode: () => ({ iat: 1000, exp: 1900 }),
} as unknown as JwtService;

const config = {
  get: (key: string) => (key === 'REFRESH_TOKEN_TTL_DAYS' ? 7 : undefined),
} as unknown as ConfigService;

function activeUser(id: number): User {
  return new User(
    id,
    'user@eiteck.local',
    'hash',
    'User',
    new Role(1, 'user', 'demo', true),
    true,
    new Date(),
    new Date(),
  );
}

function rotatedToken(userId: number): RefreshToken {
  return new RefreshToken(
    2,
    userId,
    'new-hash',
    new Date(Date.now() + 86_400_000),
    null,
    null,
    new Date(),
  );
}

describe('RefreshTokenUseCase', () => {
  it('rota y devuelve un par de tokens nuevo', async () => {
    const repo = new FakeRefreshTokenRepository();
    repo.rotateResult = { status: 'rotated', token: rotatedToken(5) };
    const useCase = new RefreshTokenUseCase(
      repo,
      new FakeUserRepository(activeUser(5)),
      jwt,
      config,
    );

    const result = await useCase.execute({ refreshToken: 'old-token' });

    expect(result.access_token).toBe('access.token.value');
    expect(result.refresh_token).toHaveLength(64);
    expect(result.expires_in).toBe(900);
    expect(result.refresh_expires_in).toBe(7 * 86_400);
    expect(result.user.id).toBe(5);
  });

  it('ante reuso revoca todas las sesiones y devuelve 401', async () => {
    const repo = new FakeRefreshTokenRepository();
    repo.rotateResult = { status: 'reused', userId: 5 };
    const useCase = new RefreshTokenUseCase(
      repo,
      new FakeUserRepository(activeUser(5)),
      jwt,
      config,
    );

    await expect(
      useCase.execute({ refreshToken: 'stolen-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repo.revokedAllFor).toEqual([5]);
  });

  it('rechaza tokens inválidos o expirados', async () => {
    for (const status of ['invalid', 'expired'] as const) {
      const repo = new FakeRefreshTokenRepository();
      repo.rotateResult = { status };
      const useCase = new RefreshTokenUseCase(
        repo,
        new FakeUserRepository(activeUser(5)),
        jwt,
        config,
      );

      await expect(
        useCase.execute({ refreshToken: 'bad' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });

  it('rechaza si el usuario ya no está activo', async () => {
    const repo = new FakeRefreshTokenRepository();
    repo.rotateResult = { status: 'rotated', token: rotatedToken(5) };
    const inactive = new User(
      5,
      'user@eiteck.local',
      'hash',
      'User',
      new Role(1, 'user', 'demo', true),
      false,
      new Date(),
      new Date(),
    );
    const useCase = new RefreshTokenUseCase(
      repo,
      new FakeUserRepository(inactive),
      jwt,
      config,
    );

    await expect(
      useCase.execute({ refreshToken: 'valid-token' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repo.revokedHashes).toHaveLength(1);
  });
});
