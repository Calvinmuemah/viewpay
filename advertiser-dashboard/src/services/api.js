const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

import axios from 'axios';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('advertiser_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });
        const { accessToken } = res.data.data;
        localStorage.setItem('advertiser_token', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('advertiser_token');
        localStorage.removeItem('advertiser_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password, type: 'advertiser' });
    return res.data;
  },
  signup: async (companyName, contactName, email, password) => {
    const res = await api.post('/auth/register/advertiser', { companyName, contactName, email, password });
    return res.data;
  },
  verifyOtp: async (email, code) => {
    const res = await api.post('/auth/verify-otp', { email, code, purpose: 'verify_email' });
    return res.data;
  },
  requestReset: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (email, code, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, code, newPassword });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    localStorage.removeItem('advertiser_token');
    localStorage.removeItem('advertiser_user');
    return res.data;
  }
};

export const campaignAPI = {
  create: async (campaignData) => {
    const res = await api.post('/campaigns', campaignData);
    return res.data;
  },
  list: async () => {
    const res = await api.get('/campaigns/my');
    return res.data;
  },
  getAnalytics: async () => {
    const res = await api.get('/analytics/my');
    return res.data;
  },
  deposit: async (amount, method, ref) => {
    const res = await api.post('/deposit', { amount, paymentMethod: method, transactionReference: ref });
    return res.data;
  },
  getBilling: async () => {
    const res = await api.get('/billing/my');
    return res.data;
  }
};

export const supportAPI = {
  listTickets: async () => {
    const res = await api.get('/tickets/my');
    return res.data;
  },
  createTicket: async (subject, message) => {
    const res = await api.post('/tickets', { subject, message });
    return res.data;
  },
  getTicket: async (id) => {
    const res = await api.get(`/tickets/${id}`);
    return res.data;
  },
  replyTicket: async (id, message) => {
    const res = await api.post(`/tickets/${id}/reply`, { message });
    return res.data;
  }
};

export const generalAPI = {
  getFaqs: async () => {
    const res = await api.get('/general/faqs');
    return res.data;
  },
  getTerms: async () => {
    const res = await api.get('/general/terms-privacy');
    return res.data;
  }
};
