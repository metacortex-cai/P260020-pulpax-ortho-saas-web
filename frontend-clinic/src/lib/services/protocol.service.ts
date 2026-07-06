import api from '../api';

export interface Protocol {
  id: string;
  protocolNo: string;
  ussStatus: 'PENDING' | 'SUCCESS' | 'ERROR';
  createdAt: string;
  patientId: string;
  patientName: string;
  patientNationalId: string;
  doctorName: string;
  treatmentName: string;
  sutCode: string;
  price: number;
  toothNo: number | null;
}

export const ProtocolService = {
  /**
   * Tüm protokolleri listeler
   */
  async findAll(): Promise<Protocol[]> {
    const response = await api.get<Protocol[]>('/protocols');
    return response.data;
  },

  /**
   * Belirli bir protokolü USS'ye aktarır
   */
  async sync(id: string): Promise<any> {
    const response = await api.post(`/protocols/${id}/sync`);
    return response.data;
  },
};
