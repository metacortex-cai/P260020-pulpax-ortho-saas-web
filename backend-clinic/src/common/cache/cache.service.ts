import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'pulpax:',
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis Connection Error', err);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: any, ttlInSeconds: number = 3600): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlInSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
