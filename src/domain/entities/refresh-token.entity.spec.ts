import { RefreshToken } from './refresh-token.entity';

function makeToken(
  overrides: { expiresAt?: Date; revokedAt?: Date | null } = {},
): RefreshToken {
  return new RefreshToken(
    1,
    1,
    'hash',
    overrides.expiresAt ?? new Date('2030-01-02T00:00:00.000Z'),
    overrides.revokedAt ?? null,
    null,
    new Date('2030-01-01T00:00:00.000Z'),
  );
}

describe('RefreshToken', () => {
  const now = new Date('2030-01-01T12:00:00.000Z');

  it('está activo si no fue revocado ni expiró', () => {
    expect(makeToken().isActive(now)).toBe(true);
  });

  it('no está activo si expiró', () => {
    const token = makeToken({ expiresAt: new Date('2030-01-01T00:00:00.000Z') });
    expect(token.isExpired(now)).toBe(true);
    expect(token.isActive(now)).toBe(false);
  });

  it('no está activo si fue revocado', () => {
    const token = makeToken({ revokedAt: new Date('2030-01-01T01:00:00.000Z') });
    expect(token.isRevoked()).toBe(true);
    expect(token.isActive(now)).toBe(false);
  });

  it('la expiración es exclusiva en el límite', () => {
    const token = makeToken({ expiresAt: now });
    expect(token.isExpired(now)).toBe(true);
  });
});
