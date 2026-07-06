import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
import * as os from 'os';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async checkHealth() {
    let databaseStatus = 'UP';
    let redisStatus = 'UP';
    const errors: string[] = [];

    // Test DB connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      databaseStatus = 'DOWN';
      errors.push(`Database connection failed: ${err.message}`);
      this.logger.error('Health Check: Database connection failed', err);
    }

    // Test Redis connection (SaaS uses Redis for BullMQ)
    let tempRedisClient: Redis | null = null;
    try {
      tempRedisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 2000,
        maxRetriesPerRequest: 0,
      });
      const pong = await tempRedisClient.ping();
      if (pong !== 'PONG') {
        redisStatus = 'DOWN';
        errors.push(`Redis returned unexpected ping reply: ${pong}`);
      }
    } catch (err) {
      redisStatus = 'DOWN';
      errors.push(`Redis connection failed: ${err.message}`);
      this.logger.error('Health Check: Redis connection failed', err);
    } finally {
      if (tempRedisClient) {
        tempRedisClient.disconnect();
      }
    }

    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      free: os.freemem(),
      total: os.totalmem(),
    };

    return {
      status: errors.length === 0 ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: databaseStatus,
        redis: redisStatus,
      },
      system: {
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        },
        os: {
          loadavg: os.loadavg(),
          freeMemory: `${Math.round(systemMemory.free / 1024 / 1024)} MB`,
          totalMemory: `${Math.round(systemMemory.total / 1024 / 1024)} MB`,
        },
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
