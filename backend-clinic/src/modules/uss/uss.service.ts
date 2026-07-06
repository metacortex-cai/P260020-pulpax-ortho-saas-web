import { Injectable, Logger } from '@nestjs/common';

export interface Transmission {
  id: string;
  patientName: string;
  nationalId: string;
  transmitType: 'VISIT' | 'TREATMENT' | 'PRESCRIPTION';
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  responseCode: string;
  message: string;
  sentAt: Date;
}

@Injectable()
export class UssService {
  private readonly logger = new Logger(UssService.name);
  private transmissions: Transmission[] = [
    {
      id: 'tx-101',
      patientName: 'Enver Nehir',
      nationalId: '123***789',
      transmitType: 'VISIT',
      status: 'SUCCESS',
      responseCode: '200',
      message: 'USS Kaydı Başarılı (e-Nabız Paket Gönderildi)',
      sentAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'tx-102',
      patientName: 'Ömer Çiftçi',
      nationalId: '987***654',
      transmitType: 'TREATMENT',
      status: 'SUCCESS',
      responseCode: '200',
      message: 'Tedavi (Diş 46 Dolgu) USS Paket Gönderimi Onaylandı',
      sentAt: new Date(Date.now() - 1800000),
    }
  ];

  async getTransmissions() {
    return this.transmissions;
  }

  async syncVisit(patientId: string, patientName: string, nationalId: string) {
    this.logger.log(`Syncing visit to USS/e-Nabız for Patient: ${patientName}`);
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const newTx: Transmission = {
      id: `tx-${Math.floor(Math.random() * 900000) + 100000}`,
      patientName,
      nationalId: nationalId.substring(0, 3) + '***' + nationalId.substring(Math.max(0, nationalId.length - 3)),
      transmitType: 'VISIT',
      status: 'SUCCESS',
      responseCode: '200',
      message: 'USS Giriş Kaydı Yapıldı, e-Nabız Referans ID atandı.',
      sentAt: new Date()
    };

    this.transmissions.unshift(newTx);
    return newTx;
  }

  async syncTreatment(patientName: string, toothNumber: number, procedureCode: string) {
    this.logger.log(`Syncing treatment to USS/e-Nabız for Tooth ${toothNumber}`);
    
    await new Promise(resolve => setTimeout(resolve, 600));

    const newTx: Transmission = {
      id: `tx-${Math.floor(Math.random() * 900000) + 100000}`,
      patientName,
      nationalId: '123***789',
      transmitType: 'TREATMENT',
      status: 'SUCCESS',
      responseCode: '200',
      message: `Tedavi (Diş ${toothNumber} - ${procedureCode}) e-Nabıza Gönderildi`,
      sentAt: new Date()
    };

    this.transmissions.unshift(newTx);
    return newTx;
  }
}
