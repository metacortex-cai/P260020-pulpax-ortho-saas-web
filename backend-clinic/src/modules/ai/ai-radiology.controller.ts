import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiRadiologyService } from './ai-radiology.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyzeXrayDto } from './dto/ai-radiology.dto';

@ApiTags('Yapay Zeka Radyoloji Analizi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/radiology')
export class AiRadiologyController {
  constructor(private readonly aiRadiologyService: AiRadiologyService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze dental X-Ray using AI object detection models' })
  @ApiResponse({ status: 201, description: 'X-Ray analysis complete.' })
  analyzeXray(@Body() body: AnalyzeXrayDto) {
    return this.aiRadiologyService.analyzeXray(body.imageUrl);
  }
}
