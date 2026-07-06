import api from '../api';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
    avatar: string;
  };
  module: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  description: string;
  ipAddress: string;
  details: {
    type: 'diff' | 'info';
    fields?: { name: string; old: string; new: string }[];
    message?: string;
  } | null;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  dateRange?: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportPreviewRow {
  status: 'valid' | 'invalid';
  data: string[];
  error?: string;
}

export interface ImportValidateResult {
  rows: ImportPreviewRow[];
  validCount: number;
  invalidCount: number;
  totalCount: number;
}

export interface ImportExecuteResult {
  importedCount: number;
  skippedCount: number;
}

export const SettingsService = {
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.search) params.set('search', filters.search);
    if (filters.module && filters.module !== 'Tümü') params.set('module', filters.module);
    if (filters.dateRange && filters.dateRange !== 'Tümü') params.set('dateRange', filters.dateRange);

    const response = await api.get<PaginatedAuditLogs>(`/audit-logs?${params.toString()}`);
    return response.data;
  },

  async downloadImportTemplate(module: string): Promise<Blob> {
    const response = await api.get(`/import/${module}/template`, { responseType: 'blob' });
    return response.data as Blob;
  },

  async validateImport(module: string, file: File): Promise<ImportValidateResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportValidateResult>(`/import/${module}/validate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async executeImport(module: string, file: File): Promise<ImportExecuteResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportExecuteResult>(`/import/${module}/execute`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
