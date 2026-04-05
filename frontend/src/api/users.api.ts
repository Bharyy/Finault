import client from './client';
import type { User } from './auth.api';

export interface UserWithCount extends User {
  transactionCount: number;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'VIEWER' | 'ANALYST' | 'ADMIN';
}

export interface UpdateUserData {
  name?: string;
  role?: 'VIEWER' | 'ANALYST' | 'ADMIN';
  isActive?: boolean;
}

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    client.get<{
      success: true;
      data: UserWithCount[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>('/users', { params }),

  get: (id: string) =>
    client.get<{ success: true; data: UserWithCount }>(`/users/${id}`),

  create: (data: CreateUserData) =>
    client.post<{ success: true; data: User }>('/users', data),

  update: (id: string, data: UpdateUserData) =>
    client.patch<{ success: true; data: User }>(`/users/${id}`, data),

  delete: (id: string) =>
    client.delete(`/users/${id}`),
};
