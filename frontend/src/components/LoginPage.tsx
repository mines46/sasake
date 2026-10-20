import React, { useState } from 'react';
import { 
  GraduationCap, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  BookOpen 
} from 'lucide-react';
import type { User as UserType } from '../types';
import { authApi } from '../api/auth';

interface LoginPageProps {
  onLoginSuccess: (user: UserType, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Por favor, introduzca Usuario y Contraseña.');
      return;
    }

    setLoading(true);
    try {
      const resp = await authApi.login({
        username: username.trim(),
        password: password.trim(),
      });
      onLoginSuccess(resp.user, resp.token);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Compruebe sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoRole: 'admin' | 'teacher') => {
    setError(null);
    if (demoRole === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('profesor');
      setPassword('profesor123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/80 p-8 sm:p-10 backdrop-blur-xl z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4 transform hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            SasaKe <span className="text-indigo-600">Academy</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Centro de Estudios & Control Académico Encina
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-700 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              {error}
            </div>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Username input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre de Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin o profesor"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                autoComplete="username"
              />
            </div>
          </div>

          {/* 2. Password input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Contraseña
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Acceder a la Plataforma</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Login selector */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Cuentas Demo Rápidas
            </span>
            <span>2 Roles</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Admin Demo Button */}
            <button
              type="button"
              onClick={() => handleFillDemo('admin')}
              className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs group-hover:text-amber-950">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Admin</span>
              </div>
              <p className="text-[10px] text-amber-700/80 mt-0.5 leading-tight truncate">
                Solo crear usuarios
              </p>
            </button>

            {/* Teacher Demo Button */}
            <button
              type="button"
              onClick={() => handleFillDemo('teacher')}
              className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-indigo-900 font-semibold text-xs group-hover:text-indigo-950">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>Profesor</span>
              </div>
              <p className="text-[10px] text-indigo-700/80 mt-0.5 leading-tight truncate">
                Toda la aplicación
              </p>
            </button>
          </div>
        </div>

        {/* Roles explanation footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <span className="font-semibold text-slate-600">SasaKe v2.0</span> • Centro de Estudios Encina
        </div>
      </div>
    </div>
  );
};

