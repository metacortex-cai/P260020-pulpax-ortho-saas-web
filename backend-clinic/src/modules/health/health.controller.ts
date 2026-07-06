import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health Check')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get application and system services health status' })
  @ApiResponse({ status: 200, description: 'Application is healthy/degraded' })
  @ApiResponse({ status: 503, description: 'Application is down/unhealthy' })
  async check(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const statusCode = health.status === 'UP' || health.status === 'DEGRADED' 
      ? HttpStatus.OK 
      : HttpStatus.SERVICE_UNAVAILABLE;
    
    return res.status(statusCode).json(health);
  }
}
