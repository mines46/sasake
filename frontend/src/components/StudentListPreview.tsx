import React from 'react';
import { Users, ChevronRight, Phone, ShieldCheck } from 'lucide-react';
import type { Student } from '../types';

interface StudentListPreviewProps {
  students: Student[];
  onViewAll?: () => void;
  onSelectStudent?: (student: Student) => void;
}

export const StudentListPreview: React.FC<StudentListPreviewProps> = ({
  students,
  onViewAll,
  onSelectStudent,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Enrolled Students</h2>
            <p className="text-xs text-slate-500">Recently active student profiles</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {students.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No hay alumnos registrados todavía.
          </div>
        ) : (
          students.map((student) => {
            const initials = `${student.first_name[0] || ''}${student.last_name[0] || ''}`;

            return (
              <div
                key={student.id}
                onClick={() => onSelectStudent?.(student)}
                className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {student.first_name} {student.last_name}
                      </p>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                          student.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{student.email}</p>
                  </div>
                </div>

                {student.guardian_name && (
                  <div className="hidden sm:flex flex-col text-right shrink-0">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                      <ShieldCheck className="w-3 h-3 text-slate-400" />
                      {student.guardian_name}
                    </span>
                    {student.guardian_phone && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 justify-end">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.guardian_phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
