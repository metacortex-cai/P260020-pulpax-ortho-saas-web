import api from '../api';

/**
 * Aynı tenant içindeki fiziksel klinik şubeleri (Klinikler). Hekim-şube
 * ataması kısıtlaması yoktur; şube bilgisi Hasta/Randevu/Ünit kayıtlarına
 * bağlanarak yalnızca raporlama amaçlı kullanılır.
 */
export interface ClinicBranch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ClinicBranchService = {
  async findAll(includePassive = false): Promise<ClinicBranch[]> {
    const response = await api.get<ClinicBranch[]>(`/clinic-branches?includePassive=${includePassive}`);
    return response.data;
  },

  async findOne(id: string): Promise<ClinicBranch> {
    const response = await api.get<ClinicBranch>(`/clinic-branches/${id}`);
    return response.data;
  },

  async create(data: { name: string; address?: string; phone?: string }): Promise<ClinicBranch> {
    const response = await api.post<ClinicBranch>('/clinic-branches', data);
    return response.data;
  },

  async update(id: string, data: Partial<Pick<ClinicBranch, 'name' | 'address' | 'phone' | 'isActive'>>): Promise<ClinicBranch> {
    const response = await api.patch<ClinicBranch>(`/clinic-branches/${id}`, data);
    return response.data;
  },
};
