import { useState } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import type { EnrichedScheduleItem, AttendanceStatus } from '../types';
import { mockStudents } from '../data/mockData';

interface AttendanceModalProps {
  isOpen: boolean;
  schedule: EnrichedScheduleItem | null;
  onClose: () => void;
  onSaveAttendance?: (records: Record<string, AttendanceStatus>) => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  schedule,
  onClose,
  onSaveAttendance,
}) => {
  // Initial student attendance states
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    mockStudents.forEach((student, idx) => {
      if (idx === 1) initial[student.id] = 'late';
      else if (idx === 4) initial[student.id] = 'absent';
      else initial[student.id] = 'present';
    });
    return initial;
  });

  if (!isOpen || !schedule) return null;

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSave = () => {
    onSaveAttendance?.(attendance);
    onClose();
  };

  const statusOptions: { value: AttendanceStatus; label: string; icon: any; color: string }[] = [
    { value: 'present', label: 'Present', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'late', label: 'Late', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'excused', label: 'Excused', icon: AlertCircle, color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { value: 'absent', label: 'Absent', icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Record Attendance: {schedule.class_name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Room: {schedule.room} • Instructor: {schedule.instructor_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 divide-y divide-slate-100">
          {mockStudents.map((student) => {
            const currentStatus = attendance[student.id] || 'present';

            return (
              <div
                key={student.id}
                className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-slate-400">{student.email}</p>
                </div>

                {/* Status selector pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {statusOptions.map((opt) => {
                    const isSelected = currentStatus === opt.value;
                    const Icon = opt.icon;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(student.id, opt.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                          isSelected
                            ? `${opt.color} shadow-2xs font-bold scale-105`
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {mockStudents.length} Students in class roster
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              Save Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
