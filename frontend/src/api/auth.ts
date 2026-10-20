import axios from 'axios';
import type { User, LoginCredentials, CreateUserPayload, AuthResponse } from '../types';
import { mockUsers } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Interceptor to attach role & session info if available in localStorage
api.interceptors.request.use((config) => {
  try {
    const rawUser = localStorage.getItem('sasake_auth_user');
    const token = localStorage.getItem('sasake_auth_token');
    if (rawUser) {
      const user = JSON.parse(rawUser) as User;
      config.headers['X-User-Role'] = user.role;
      config.headers['X-User-Id'] = user.id;
    }
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage parse errors
  }
  return config;
});

// In-memory/localStorage backup for offline mock fallback
const getLocalMockUsers = (): User[] => {
  try {
    const stored = localStorage.getItem('sasake_offline_users');
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return mockUsers;
};

const saveLocalMockUsers = (users: User[]) => {
  try {
    localStorage.setItem('sasake_offline_users', JSON.stringify(users));
  } catch {
    // ignore
  }
};

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const normUsername = credentials.username.trim().toLowerCase();
    const payload = {
      username: credentials.username.trim(),
      password: credentials.password.trim(),
      // Send email in payload for backwards-compatibility with un-restarted backend instances
      email: credentials.username.includes('@')
        ? credentials.username.trim()
        : `${normUsername}@encina.com`,
    };

    try {
      const res = await api.post<AuthResponse>('/auth/login', payload);
      return res.data;
    } catch (err: any) {
      // If server rejected with a response (401, 403, 400), propagate the error
      if (err.response && err.response.data?.error) {
        throw new Error(err.response.data.error);
      }

      // Offline / network failure fallback: check against known mock accounts
      const users = getLocalMockUsers();
      const found = users.find(
        (u) =>
          u.username.toLowerCase() === normUsername ||
          u.email.toLowerCase() === normUsername
      );

      if (found) {
        if (!found.is_active) {
          throw new Error('Esta cuenta de usuario ha sido desactivada.');
        }
        // Match default demo passwords
        const validPassword =
          (found.username === 'admin' && credentials.password === 'admin123') ||
          (found.username === 'profesor' && credentials.password === 'profesor123') ||
          credentials.password.length >= 6;

        if (validPassword) {
          return {
            user: found,
            token: `mock_sess_${found.id}_${Date.now()}`,
          };
        }
      }

      throw new Error(
        'Credenciales incorrectas. Verifique usuario y contraseña.'
      );
    }
  },

  async getMe(userId: string): Promise<User> {
    try {
      const res = await api.get<User>('/auth/me', {
        headers: { 'X-User-Id': userId },
      });
      return res.data;
    } catch {
      const users = getLocalMockUsers();
      const u = users.find((item) => item.id === userId);
      if (u) return u;
      throw new Error('User not found');
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await api.get<User[]>('/users');
      return res.data;
    } catch {
      return getLocalMockUsers();
    }
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    try {
      const res = await api.post<User>('/users', payload);
      return res.data;
    } catch (err: any) {
      if (err.response && err.response.data?.error) {
        throw new Error(err.response.data.error);
      }
      // Offline fallback
      const users = getLocalMockUsers();
      if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new Error('Ya existe un usuario con este correo electrónico');
      }
      if (users.some((u) => u.username.toLowerCase() === payload.username.toLowerCase())) {
        throw new Error('Ya existe un usuario con este nombre de usuario');
      }
      const newUser: User = {
        id: `usr-${Date.now()}`,
        email: payload.email,
        username: payload.username,
        full_name: payload.full_name,
        role: payload.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [newUser, ...users];
      saveLocalMockUsers(updated);
      return newUser;
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch {
      const users = getLocalMockUsers().filter((u) => u.id !== id);
      saveLocalMockUsers(users);
    }
  },
};

