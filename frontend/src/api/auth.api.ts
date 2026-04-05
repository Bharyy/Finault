import client from './client';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'VIEWER' | 'ANALYST' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: (data: LoginData) =>
    client.post<{ success: true; data: AuthResponse }>('/auth/login', data),

  register: (data: RegisterData) =>
    client.post<{ success: true; data: AuthResponse }>('/auth/register', data),

  me: () =>
    client.get<{ success: true; data: User }>('/auth/me'),

  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),
};
