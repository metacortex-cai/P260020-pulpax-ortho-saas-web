import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { ApiError } from './types';

// Extends axios config to track whether a request has already been retried
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Type-safe API İstemcisi
const api: AxiosInstance = axios.create({
  // DEV FALLBACK ONLY — set NEXT_PUBLIC_API_URL in production
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7010/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Cookielerin gönderilmesi için gerekli (HttpOnly Token'lar)
  timeout: 30000,
});

// Request Interceptor - Sadece Tenant header'ını ekle
api.interceptors.request.use((config) => {
  const { tenantId } = useAuthStore.getState();

  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }

  return config;
});

// Response Interceptor - Token expire handle et
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as RetryableRequestConfig;

    const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

    // Token expire (401) hatası ve retry için belirtilmemişse (auth istekleri hariç)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        // Refresh endpoint'ini çağır, refresh_token cookie'den otomatik gidecektir
        // DEV FALLBACK ONLY — set NEXT_PUBLIC_API_URL in production
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7010/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Başarılı olursa original request'i retry et
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh başarısız olursa logout et
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
