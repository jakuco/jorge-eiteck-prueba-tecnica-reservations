import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE, type DB } from '../database.module';
import { refreshTokens } from '../schema';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  IRefreshTokenRepository,
  NewRefreshTokenData,
  RotateResult,
} from '../../domain/repositories/refresh-token.repository.interface';

@Injectable()
export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(@Inject(DATABASE) private readonly db: DB) {}

  async create(userId: number, data: NewRefreshTokenData): Promise<RefreshToken> {
    const [row] = await this.db
      .insert(refreshTokens)
      .values({
        userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
      })
      .returning();
    return this.toDomain(row);
  }

  async findByHash(hash: string): Promise<RefreshToken | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async rotate(
    oldHash: string,
    data: NewRefreshTokenData,
    now: Date,
  ): Promise<RotateResult> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, oldHash))
        .limit(1);

      if (!existing) return { status: 'invalid' as const };
      if (existing.revokedAt !== null) {
        return { status: 'reused' as const, userId: existing.userId };
      }
      if (existing.expiresAt.getTime() <= now.getTime()) {
        return { status: 'expired' as const };
      }

      const [consumed] = await tx
        .update(refreshTokens)
        .set({ revokedAt: now })
        .where(
          and(eq(refreshTokens.id, existing.id), isNull(refreshTokens.revokedAt)),
        )
        .returning();

      if (!consumed) {
        return { status: 'reused' as const, userId: existing.userId };
      }

      const [created] = await tx
        .insert(refreshTokens)
        .values({
          userId: existing.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          userAgent: data.userAgent ?? null,
          ip: data.ip ?? null,
        })
        .returning();

      await tx
        .update(refreshTokens)
        .set({ replacedById: created.id })
        .where(eq(refreshTokens.id, consumed.id));

      return { status: 'rotated' as const, token: this.toDomain(created) };
    });
  }

  async revokeByHash(hash: string, now: Date): Promise<boolean> {
    const rows = await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt)),
      )
      .returning({ id: refreshTokens.id });
    return rows.length > 0;
  }

  async revokeAllForUser(userId: number, now: Date): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: now })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }

  private toDomain(row: typeof refreshTokens.$inferSelect): RefreshToken {
    return new RefreshToken(
      row.id,
      row.userId,
      row.tokenHash,
      row.expiresAt,
      row.revokedAt,
      row.replacedById,
      row.createdAt,
    );
  }
}
