import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Users, 
  GraduationCap, 
  LogOut, 
  Trash2, 
  Pencil, 
  Search, 
  Mail, 
  User as UserIcon, 
  Lock, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen 
} from 'lucide-react';
import type { User, CreateUserPayload, UpdateUserPayload } from '../types';
import { authApi } from '../api/auth';

interface AdminUsersPageProps {
  currentUser: User;
  onLogout: () => void;
  onUpdateCurrentUser?: (user: User) => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ currentUser, onLogout, onUpdateCurrentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states for creating new user
  const [formData, setFormData] = useState<CreateUserPayload>({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'teacher',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // States for editing user
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<{
    email: string;
    username: string;
    password: string;
    full_name: string;
    role: 'admin' | 'teacher';
    is_active: boolean;
  }>({
    email: '',
    username: '',
    password: '',
    full_name: '',
    role: 'teacher',
    is_active: true,
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    authApi.getUsers().then((data) => {
      if (isMounted) {
        setUsers(data);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenModal = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      full_name: '',
      role: 'teacher',
    });
    setFormError(null);
    setFormSuccess(null);
    setIsNewUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.email.trim() || !formData.username.trim() || !formData.password.trim()) {
      setFormError('Por favor complete correo, nombre de usuario y contraseña.');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await authApi.createUser({
        ...formData,
        email: formData.email.trim(),
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
      });
      setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
      setFormSuccess(`¡Usuario "${created.username}" creado exitosamente!`);
      setTimeout(() => {
        setIsNewUserModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Error al crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
    });
    setEditFormError(null);
    setEditFormSuccess(null);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditFormError(null);
    setEditFormSuccess(null);

    if (!editFormData.email.trim() || !editFormData.username.trim()) {
      setEditFormError('Por favor complete correo y nombre de usuario.');
      return;
    }

    if (editFormData.password.trim() && editFormData.password.trim().length < 6) {
      setEditFormError('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload: UpdateUserPayload = {
        email: editFormData.email.trim(),
        username: editFormData.username.trim(),
        full_name: editFormData.full_name.trim(),
        role: editFormData.role,
        is_active: editFormData.is_active,
      };

      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const updated = await authApi.updateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

      // If admin updated their own session account, update app state immediately
      if (editingUser.id === currentUser.id) {
        onUpdateCurrentUser?.(updated);
      }

      setEditFormSuccess(`¡Usuario "${updated.username}" actualizado correctamente!`);
      setTimeout(() => {
        setIsEditUserModalOpen(false);
      }, 1100);
    } catch (err: any) {
      setEditFormError(err.message || 'Error al actualizar el usuario.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (id === currentUser.id) {
      alert('No puede eliminar su propia cuenta de administrador en sesión.');
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea eliminar al usuario "${username}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await authApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered users by search
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  });

  const teacherCount = users.filter((u) => u.role === 'teacher').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">SasaKe</span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Panel Administrador
              </span>
            </div>
            <p className="text-xs text-slate-400">Centro de Estudios Encina — Gestión Exclusiva de Usuarios</p>
          </div>
        </div>

        {/* Current Admin details & Logout button */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">{currentUser.full_name || currentUser.username}</span>
            <span className="text-[11px] text-slate-400">{currentUser.email}</span>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 border border-slate-700 hover:border-rose-800/80 transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Notice Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-4 shadow-2xs">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-900">
              Módulo de Administración de Accesos
            </h2>
            <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
              Su rol asignado es <strong>Administrador</strong>. Este panel está restringido exclusivamente a la creación y gestión de credenciales para el personal. Los usuarios con rol <strong>Profesor</strong> tienen acceso integral al panel docente (alumnos, cursos, asistencias y recibos de facturación).
            </p>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Cuentas</p>
              <p className="text-xl font-bold text-slate-900">{users.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Profesores (App completa)</p>
              <p className="text-xl font-bold text-indigo-600">{teacherCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Administradores</p>
              <p className="text-xl font-bold text-amber-600">{adminCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Cuentas Activas</p>
              <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
            </div>
          </div>
        </div>

        {/* Action Bar: Search & New User Button */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuario, correo o nombre..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          <button
            onClick={handleOpenModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Nuevo Usuario</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Usuarios Registrados en el Sistema</h3>
              <p className="text-xs text-slate-500 mt-0.5">Listado de cuentas autorizadas para operar en SasaKe</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {filteredUsers.length} usuarios
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Cargando usuarios...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No se encontraron usuarios que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3.5">Usuario & Nombre</th>
                    <th className="px-5 py-3.5">Correo (Mail)</th>
                    <th className="px-5 py-3.5">Rol de Acceso</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Fecha de Alta</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredUsers.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* User & Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                              isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                              {u.username.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                <span>{u.username}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-normal">
                                {u.full_name || 'Sin nombre registrado'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                          {u.email}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-3.5">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>Admin (Solo usuarios)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Profesor (App completa)</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              Inactivo
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title={isSelf ? 'Editar mi cuenta de administrador' : 'Editar usuario'}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={isSelf || deletingId === u.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title={isSelf ? 'No puede eliminar su propia cuenta' : 'Eliminar usuario'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Agregar Nuevo Usuario */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-500">Asigne credenciales y rol de acceso</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ej: Prof. María Fernández"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Mail) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="maria.fernandez@encina.com"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="mfernandez"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña (Mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Rol de Acceso *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                    formData.role === 'teacher'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Profesor</span>
                      </div>
                      <input
                        type="radio"
                        name="role"
                        value="teacher"
                        checked={formData.role === 'teacher'}
                        onChange={() => setFormData({ ...formData, role: 'teacher' })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Acceso completo a la aplicación (Alumnos, Clases, Asistencias, Recibos)
                    </p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                    formData.role === 'admin'
                      ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Admin</span>
                      </div>
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={formData.role === 'admin'}
                        onChange={() => setFormData({ ...formData, role: 'admin' })}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Solo crear y administrar usuarios del sistema
                    </p>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Editar Usuario: {editingUser.username}</span>
                    {editingUser.id === currentUser.id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                        Tu Cuenta
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">Modifique los datos, credenciales o permisos</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {editingUser.id === currentUser.id && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>Estás editando tu propia cuenta de administrador en sesión. Los cambios se aplicarán inmediatamente.</span>
                </div>
              )}

              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{editFormError}</span>
                </div>
              )}

              {editFormSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{editFormSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  placeholder="Ej: Administrador Encina"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Mail) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* New Password (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Nueva Contraseña <span className="text-slate-400 lowercase font-normal">(opcional)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Mínimo 6 caracteres</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    placeholder="Dejar en blanco para mantener la contraseña actual"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Role & Active Status Row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Rol de Usuario
                  </label>
                  <select
                    disabled={editingUser.id === currentUser.id}
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'teacher' })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                  >
                    <option value="teacher">Profesor (App completa)</option>
                    <option value="admin">Admin (Gestión usuarios)</option>
                  </select>
                  {editingUser.id === currentUser.id && (
                    <p className="text-[10px] text-slate-400 mt-1">Tu rol actual no puede cambiarse</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estado
                  </label>
                  <select
                    disabled={editingUser.id === currentUser.id}
                    value={editFormData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.value === 'active' })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                  {editingUser.id === currentUser.id && (
                    <p className="text-[10px] text-slate-400 mt-1">No puedes desactivarte a ti mismo</p>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
