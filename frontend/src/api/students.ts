import axios from 'axios';
import type { Student } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export const studentApi = {
  async getAll(status?: string, search?: string): Promise<Student[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const res = await api.get<Student[]>(`/students?${params.toString()}`);
    return res.data;
  },

  async getById(id: string): Promise<Student> {
    const res = await api.get<Student>(`/students/${id}`);
    return res.data;
  },

  async create(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> {
    const res = await api.post<Student>('/students', data);
    return res.data;
  },

  async update(id: string, data: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>): Promise<Student> {
    const res = await api.put<Student>(`/students/${id}`, data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  },
};
