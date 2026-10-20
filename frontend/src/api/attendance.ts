import axios from 'axios';
import type { 
  Attendance, 
  EnrichedAttendance, 
  BatchAttendanceInput, 
  AttendanceSummary 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export const attendanceApi = {
  /**
   * Fetch attendance records for a specific class on a given date (defaults to today)
   */
  async getByClassAndDate(classId: string, date?: string): Promise<EnrichedAttendance[]> {
    const params = new URLSearchParams();
    params.append('class_id', classId);
    if (date) params.append('date', date);

    const res = await api.get<EnrichedAttendance[]>(`/attendance?${params.toString()}`);
    return res.data;
  },

  /**
   * Record batch roll-call attendance for a class session
   */
  async recordBatch(input: BatchAttendanceInput): Promise<{ message: string; date: string; count: number }> {
    const res = await api.post<{ message: string; date: string; count: number }>('/attendance/batch', input);
    return res.data;
  },

  /**
   * Fetch attendance history for a single student within a date range (used for billing calculation)
   */
  async getByStudent(studentId: string, startDate?: string, endDate?: string): Promise<Attendance[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const res = await api.get<Attendance[]>(`/attendance/student/${studentId}?${params.toString()}`);
    return res.data;
  },

  /**
   * Fetch daily aggregated metrics (present, late, absent, excused counts and rate)
   */
  async getDailyMetrics(date?: string): Promise<AttendanceSummary> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const res = await api.get<AttendanceSummary>(`/attendance/metrics/daily?${params.toString()}`);
    return res.data;
  },
};

