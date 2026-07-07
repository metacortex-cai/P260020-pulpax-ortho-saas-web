import api from '../api';

/**
 * Pulpax Ortho: HR modülü (personel izin/mesai/sözleşme/prim) kapsam dışı
 * bırakıldı (client scope-reduction kararı). Bu servis, eski Employee tabanlı
 * personel yönetimi yerine yalnızca randevu/tedavi/ortodonti ekranlarındaki
 * hekim seçim listelerini ve hekimin kendi hesap bilgilerini (ad/soyad/
 * telefon/unvan/fotoğraf) besleyen minimal Doctor CRUD'unu sarar.
 */
export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isDoctor: boolean;
  userId?: string | null;
  phone?: string;
  title?: string;
  isActive: boolean;
  createdAt: string;
  photoUrl?: string | null;
}

export const DoctorService = {
  async findAll(includePassive = false): Promise<Doctor[]> {
    const response = await api.get<Doctor[]>(`/doctors?includePassive=${includePassive}`);
    return response.data;
  },

  async findOne(id: string): Promise<Doctor> {
    const response = await api.get<Doctor>(`/doctors/${id}`);
    return response.data;
  },

  async create(data: { firstName: string; lastName: string; email: string; phone?: string; title?: string }): Promise<Doctor> {
    const response = await api.post<Doctor>('/doctors', data);
    return response.data;
  },

  async update(id: string, data: Partial<Pick<Doctor, 'firstName' | 'lastName' | 'email' | 'phone' | 'title' | 'isDoctor' | 'isActive'>>): Promise<Doctor> {
    const response = await api.patch<Doctor>(`/doctors/${id}`, data);
    return response.data;
  },

  async uploadPhoto(id: string, file: File): Promise<Doctor> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Doctor>(`/doctors/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(id: string): Promise<Doctor> {
    const response = await api.delete<Doctor>(`/doctors/${id}/photo`);
    return response.data;
  },
};
