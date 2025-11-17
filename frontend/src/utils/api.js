import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response interceptor: auto-logout deactivated accounts
api.interceptors.response.use(
  (res) => res,
  (error) => {
    try {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || '';
      if (status === 401) {
        const hadToken = !!localStorage.getItem('token') || !!(error?.config?.headers?.Authorization);
        if (hadToken) {
          try { localStorage.removeItem('token'); } catch (_) {}
          try { window.dispatchEvent(new CustomEvent('app:auth', { detail: { type: 'logout', reason: 'expired' } })); } catch (_) {}
        }
      }
      if (status === 403 && /deactivated/i.test(msg)) {
        try { localStorage.removeItem('token'); } catch (_) {}
        try { window.dispatchEvent(new CustomEvent('app:auth', { detail: { type: 'logout', reason: 'deactivated' } })); } catch (_) {}
      }
    } catch (_) {}
    return Promise.reject(error);
  }
);

export const toFormData = (obj) => {
  const fd = new FormData();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'photos' && Array.isArray(v)) {
      v.forEach((file) => fd.append('photos', file));
    } else {
      fd.append(k, v);
    }
  });
  return fd;
};
