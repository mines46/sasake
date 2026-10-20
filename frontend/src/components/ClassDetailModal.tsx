import { 
  X, 
  BookOpen, 
  Users, 
  DollarSign, 
  Clock, 
  MapPin, 
  Edit3, 
  CheckCircle2, 
  Calendar
} from 'lucide-react';
import type { ClassItem, Enrollment, Student, ClassSchedule } from '../types';
import { formatCents, formatTime, getDayName } from '../utils/formatters';

interface ClassDetailModalProps {
  classItem: ClassItem | null;
  onClose: () => void;
  onEdit: (cls: ClassItem) => void;
  onTakeAttendance?: (cls: ClassItem) => void;
  enrollments: Enrollment[];
  students: Student[];
  schedules: ClassSchedule[];
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  classItem,
  onClose,
  onEdit,
  onTakeAttendance,
  enrollments,
  students,
  schedules,
}) => {
  if (!classItem) return null;

  // Filter enrollments for this class
  const classEnrollments = enrollments.filter(
    (e) => e.class_id === classItem.id && e.status === 'active'
  );
  
  // Enrolled student profiles
  const enrolledStudents = classEnrollments
    .map((e) => students.find((s) => s.id === e.student_id))
    .filter((s): s is Student => !!s);

  // Schedules for this class
  const classSchedules = schedules.filter((s) => s.class_id === classItem.id);

  const fillRatio = Math.round((classEnrollments.length / classItem.capacity) * 100);
  const isNearCapacity = fillRatio >= 90;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{classItem.name}</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    classItem.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {classItem.is_active ? 'Active Course' : 'Archived'}
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    classItem.class_type === 'individual'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {classItem.class_type === 'individual' ? 'Individual (Por Asistencia)' : 'Grupal (Adelantado Mensual)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instructor: <strong className="text-slate-700">{classItem.instructor_name || 'Unassigned'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Description */}
          {classItem.description && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed text-xs">
              {classItem.description}
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Session Rate Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-100 space-y-1.5">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                Session Billing Rate (Recibos)
              </span>
              <div className="text-2xl font-black text-indigo-700 font-mono">
                {formatCents(classItem.cost_per_session_cents)}
                <span className="text-xs font-normal text-slate-500 ml-1">/ session</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Tuition bills calculated per attended session + unexcused absences.
              </p>
            </div>

            {/* Capacity Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Capacity Utilization
                </span>
                <span className={`text-xs font-bold ${isNearCapacity ? 'text-amber-600' : 'text-slate-700'}`}>
                  {classEnrollments.length} / {classItem.capacity} Enrolled ({fillRatio}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNearCapacity ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(fillRatio, 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500">
                {classItem.capacity - classEnrollments.length > 0
                  ? `${classItem.capacity - classEnrollments.length} seat(s) available for new enrollments`
                  : 'Course is at maximum capacity'}
              </p>
            </div>
          </div>

          {/* Weekly Timetable Slots */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Weekly Class Schedule Slots ({classSchedules.length})
            </span>

            {classSchedules.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                No recurring timetable slot scheduled yet for this course.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {classSchedules.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {getDayName(sch.day_of_week)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime(sch.start_time)} – {formatTime(sch.end_time)}</span>
                      </div>
                    </div>
                    {sch.room && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {sch.room}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enrolled Students Roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                Enrolled Students ({enrolledStudents.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Active roster
              </span>
            </div>

            {enrolledStudents.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
                No students currently enrolled in this class.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {enrolledStudents.map((st) => (
                  <div key={st.id} className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {st.first_name[0]}{st.last_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {st.first_name} {st.last_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {st.email}
                        </div>
                      </div>
                    </div>

                    {st.guardian_name && (
                      <div className="text-right text-[11px] text-slate-500">
                        Guardian: <strong>{st.guardian_name}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => onEdit(classItem)}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Class
          </button>

          <div className="flex items-center gap-2">
            {onTakeAttendance && (
              <button
                onClick={() => {
                  onTakeAttendance(classItem);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Take Attendance
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
