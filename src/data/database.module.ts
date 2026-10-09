import {
  Module,
  Global,
  Injectable,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type DB = PostgresJsDatabase<typeof schema>;

@Injectable()
export class PostgresClientProvider implements OnApplicationShutdown {
  private readonly client: Sql;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    this.client = postgres(url, { max: 10, prepare: false });
  }

  getClient(): Sql {
    return this.client;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.end();
  }
}

@Module({
  imports: [ConfigModule],
  providers: [
    PostgresClientProvider,
    {
      provide: DATABASE,
      inject: [PostgresClientProvider],
      useFactory: (provider: PostgresClientProvider): DB =>
        drizzle(provider.getClient(), { schema }),
    },
  ],
  exports: [DATABASE, PostgresClientProvider],
})
@Global()
export class DatabaseModule {}