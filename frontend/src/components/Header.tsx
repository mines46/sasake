import React, { useState } from 'react';
import { Menu, Search, Bell, Plus, Calendar, LogOut } from 'lucide-react';
import type { User } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenNewStudent: () => void;
  onOpenNewInvoice: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

const getFormattedToday = () =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenNewStudent,
  onOpenNewInvoice,
  searchQuery,
  setSearchQuery,
  currentUser,
  onLogout,
}) => {
  // Today's formatted display date
  const [todayFormatted] = useState(getFormattedToday);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left side: Hamburger (mobile) + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students, classes, or invoices..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Right side: Date, Notifications, Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date pill */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{todayFormatted}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>
        </div>

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewStudent}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            Student
          </button>

          <button
            onClick={onOpenNewInvoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </button>

          {/* User profile pill */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] uppercase">
                {currentUser.username.substring(0, 2)}
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {currentUser.full_name || currentUser.username}
                </p>
                <p className="text-[10px] text-indigo-600 font-medium capitalize">
                  {currentUser.role === 'teacher' ? 'Profesor' : currentUser.role}
                </p>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
