import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface Invoice {
  id: string;
  invoiceNo: string;
  ettn: string; // GIB UUID
  patientName: string;
  taxId: string;
  amount: number;
  taxAmount: number;
  total: number;
  type: 'E-FATURA' | 'E-ARSIV' | 'E-SMM';
  status: 'SIGNED' | 'PENDING' | 'CANCELLED';
  signedAt: Date;
}

@Injectable()
export class EfaturaService {
  private readonly logger = new Logger(EfaturaService.name);
  private invoices: Invoice[] = [
    {
      id: 'inv-301',
      invoiceNo: 'PLP2026000000001',
      ettn: '3c990b79-58dc-4e2b-b838-89c6d3df8e2b',
      patientName: 'Enver Nehir',
      taxId: '1234567890',
      amount: 1000,
      taxAmount: 100,
      total: 1100,
      type: 'E-SMM',
      status: 'SIGNED',
      signedAt: new Date(Date.now() - 3600000)
    }
  ];

  async getInvoices() {
    return this.invoices;
  }

  async createInvoice(patientName: string, taxId: string, amount: number, type: 'E-FATURA' | 'E-ARSIV' | 'E-SMM') {
    this.logger.log(`Generating GİB ${type} for Patient: ${patientName}`);

    await new Promise(resolve => setTimeout(resolve, 850));

    const taxAmount = Number((amount * 0.10).toFixed(2)); // 10% KDV for healthcare
    const total = Number((amount + taxAmount).toFixed(2));
    
    // Generate UUID (ETTN)
    const ettn = crypto.randomUUID();
    
    // Generate invoice number e.g. PLP2026000000002
    const currentYear = new Date().getFullYear();
    const serial = type === 'E-SMM' ? 'SMM' : 'PLP';
    const randNum = String(this.invoices.length + 1).padStart(9, '0');
    const invoiceNo = `${serial}${currentYear}${randNum}`;

    const newInvoice: Invoice = {
      id: `inv-${Math.floor(Math.random() * 90000) + 10000}`,
      invoiceNo,
      ettn,
      patientName,
      taxId: taxId || '11111111111',
      amount,
      taxAmount,
      total,
      type,
      status: 'SIGNED',
      signedAt: new Date()
    };

    this.invoices.unshift(newInvoice);
    return newInvoice;
  }
}
