import axios from 'axios';
import type { ClassItem, ClassSchedule } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export const classApi = {
  async getAll(active?: boolean, search?: string): Promise<ClassItem[]> {
    const params = new URLSearchParams();
    if (active !== undefined) params.append('active', String(active));
    if (search) params.append('search', search);

    const res = await api.get<ClassItem[]>(`/classes?${params.toString()}`);
    return res.data;
  },

  async getById(id: string): Promise<ClassItem> {
    const res = await api.get<ClassItem>(`/classes/${id}`);
    return res.data;
  },

  async create(data: Omit<ClassItem, 'id' | 'created_at'>): Promise<ClassItem> {
    const res = await api.post<ClassItem>('/classes', data);
    return res.data;
  },

  async update(id: string, data: Partial<Omit<ClassItem, 'id' | 'created_at'>>): Promise<ClassItem> {
    const res = await api.put<ClassItem>(`/classes/${id}`, data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/classes/${id}`);
  },

  async getSchedules(classId: string): Promise<ClassSchedule[]> {
    const res = await api.get<ClassSchedule[]>(`/classes/${classId}/schedules`);
    return res.data;
  },

  async addSchedule(
    classId: string,
    schedule: Omit<ClassSchedule, 'id' | 'class_id'>
  ): Promise<ClassSchedule> {
    const res = await api.post<ClassSchedule>(`/classes/${classId}/schedules`, schedule);
    return res.data;
  },

  async deleteSchedule(classId: string, scheduleId: string): Promise<void> {
    await api.delete(`/classes/${classId}/schedules/${scheduleId}`);
  },
};
