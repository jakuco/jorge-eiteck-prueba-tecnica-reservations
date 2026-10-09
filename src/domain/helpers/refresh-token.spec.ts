import { generateRefreshToken, hashRefreshToken } from './refresh-token';

describe('refresh-token helpers', () => {
  it('genera tokens distintos y con suficiente entropía', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(50);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('el hash es determinístico y de 64 hex (sha256)', () => {
    const token = generateRefreshToken();
    const h1 = hashRefreshToken(token);
    const h2 = hashRefreshToken(token);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('tokens distintos producen hashes distintos', () => {
    expect(hashRefreshToken(generateRefreshToken())).not.toBe(
      hashRefreshToken(generateRefreshToken()),
    );
  });
});
