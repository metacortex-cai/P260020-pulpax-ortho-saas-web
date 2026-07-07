import api from '../api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  title?: string;
  isActive: boolean;
  employeeId?: string | null;
  isSystemAdmin: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password?: string;
  phone?: string;
  title?: string;
  employeeId?: string;
}

export interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  current: boolean;
  date: string;
}

export const UserService = {
  async findAll(includePassive = false): Promise<User[]> {
    const response = await api.get<User[]>(`/users?includePassive=${includePassive}`);
    return response.data;
  },

  async findOne(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserPayload): Promise<User> {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateUserPayload> & { isActive?: boolean }): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  async deactivate(id: string, reason?: string): Promise<void> {
    await api.patch(`/users/${id}/deactivate`, { reason });
  },

  async reactivate(id: string): Promise<void> {
    await api.patch(`/users/${id}/reactivate`);
  },

  async transferSystemAdmin(toUserId: string): Promise<{ systemAdminUserId: string }> {
    const response = await api.post<{ systemAdminUserId: string }>('/users/transfer-system-admin', { toUserId });
    return response.data;
  },

  // --- Hesap / oturum yönetimi ("Ayarlar > Profil" sayfası) ---
  // NOT: bu üç oturum metodu daha önce employee.service.ts içinde yaşıyordu
  // (Employee/HR ile ilgisi yoktu, sadece o dosyaya konmuştu). Employee
  // kaldırıldığı için buraya taşındı; /auth/sessions* ve /auth/change-password
  // backend'de henüz karşılığı olmayan uçlar (bu taşımadan önce de öyleydi).

  async getSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>('/auth/sessions');
    return response.data;
  },

  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/auth/sessions/${sessionId}`);
  },

  async revokeAllOtherSessions(): Promise<void> {
    await api.delete('/auth/sessions/others');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/auth/change-password', { currentPassword, newPassword });
  },
};
