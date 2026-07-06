import { Injectable, Logger } from '@nestjs/common';

export interface Prescription {
  id: string;
  ereceteNo: string;
  patientName: string;
  doctorName: string;
  medications: string[];
  type: string; // normal, kirmizi, yesil, turuncu
  status: 'REGISTERED' | 'FAILED';
  createdAt: Date;
}

@Injectable()
export class EreceteService {
  private readonly logger = new Logger(EreceteService.name);
  private prescriptions: Prescription[] = [
    {
      id: 'p-201',
      ereceteNo: 'ER2026A59B',
      patientName: 'Enver Nehir',
      doctorName: 'Dr. Ahmet Yılmaz',
      medications: ['Augmentin 1000mg Tablet (1x1)', 'Parol 500mg Tablet (3x1)'],
      type: 'Normal',
      status: 'REGISTERED',
      createdAt: new Date(Date.now() - 3600000)
    }
  ];

  async getPrescriptions() {
    return this.prescriptions;
  }

  async createPrescription(patientName: string, doctorName: string, medications: string[], type: string) {
    this.logger.log(`Registering e-Reçete with SGK for: ${patientName}`);

    await new Promise(resolve => setTimeout(resolve, 900));

    // Generate random 10-char alphanumeric SGK e-prescription code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ereceteNo = 'ER';
    for (let i = 0; i < 8; i++) {
      ereceteNo += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newPrescription: Prescription = {
      id: `p-${Math.floor(Math.random() * 90000) + 10000}`,
      ereceteNo,
      patientName,
      doctorName,
      medications,
      type,
      status: 'REGISTERED',
      createdAt: new Date()
    };

    this.prescriptions.unshift(newPrescription);
    return newPrescription;
  }
}
