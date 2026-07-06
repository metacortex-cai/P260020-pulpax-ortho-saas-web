import { Injectable, Logger } from '@nestjs/common';

export interface BoundingBox {
  x: number; // percentage from left
  y: number; // percentage from top
  width: number;
  height: number;
}

export interface Diagnosis {
  toothNumber: number;
  condition: 'CARIES' | 'CROWN' | 'ROOT_CANAL' | 'IMPLANT';
  confidence: number; // 0 to 1
  box: BoundingBox;
}

@Injectable()
export class AiRadiologyService {
  private readonly logger = new Logger(AiRadiologyService.name);

  async analyzeXray(imageUrl: string): Promise<{ diagnoses: Diagnosis[]; notes: string }> {
    this.logger.log(`Analyzing X-Ray image with simulated AI Model: ${imageUrl}`);

    // Simulate Deep Learning analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      diagnoses: [
        {
          toothNumber: 46,
          condition: 'CARIES',
          confidence: 0.94,
          box: { x: 35, y: 45, width: 8, height: 12 }
        },
        {
          toothNumber: 11,
          condition: 'CROWN',
          confidence: 0.99,
          box: { x: 50, y: 30, width: 10, height: 15 }
        },
        {
          toothNumber: 36,
          condition: 'ROOT_CANAL',
          confidence: 0.88,
          box: { x: 20, y: 60, width: 8, height: 20 }
        }
      ],
      notes: 'AI Model tespit özeti: Alt çene sağ 1. büyük azı (46) oklüzal yüzeyde derin çürük şüphesi. Üst çene sağ 1. kesici (11) kron kaplama. Alt çene sol 1. büyük azı (36) kanal tedavili.'
    };
  }
}
