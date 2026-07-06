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
};
