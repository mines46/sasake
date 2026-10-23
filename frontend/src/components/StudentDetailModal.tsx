import { 
  X, 
  Mail, 
  Phone, 
  ShieldCheck, 
  BookOpen, 
  Calendar, 
  Receipt, 
  Edit3,
  GraduationCap,
  School
} from 'lucide-react';
import type { Student, ClassItem, Enrollment, Attendance } from '../types';
import { formatDate } from '../utils/formatters';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onGenerateRecibo?: (student: Student) => void;
  enrollments: Enrollment[];
  classes: ClassItem[];
  attendanceHistory: Attendance[];
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onEdit,
  onGenerateRecibo,
  enrollments,
  classes,
  attendanceHistory,
}) => {
  if (!student) return null;

  // Enrolled courses for this student
  const studentEnrollments = enrollments.filter(
    (e) => e.student_id === student.id && e.status === 'active'
  );
  const enrolledClasses = studentEnrollments
    .map((e) => classes.find((c) => c.id === e.class_id))
    .filter((c): c is ClassItem => !!c);

  // Student's attendance history
  const studentAttendance = attendanceHistory.filter(
    (a) => a.student_id === student.id
  );

  const presentCount = studentAttendance.filter((a) => a.status === 'present').length;
  const lateCount = studentAttendance.filter((a) => a.status === 'late').length;
  const absentCount = studentAttendance.filter((a) => a.status === 'absent').length;
  const excusedCount = studentAttendance.filter((a) => a.status === 'excused').length;
  const totalRecorded = studentAttendance.length;

  const attendanceRate = totalRecorded
    ? Math.round(((presentCount + lateCount * 0.8) / totalRecorded) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-600/20">
              {student.first_name[0]}{student.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {student.first_name} {student.last_name}
                </h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    student.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : student.status === 'suspended'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {student.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered on {formatDate(student.created_at)}
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
          {/* Contact & Guardian Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Contact */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Student Direct Contact
              </span>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${student.email}`} className="text-indigo-600 hover:underline">
                    {student.email}
                  </a>
                </p>
                <p className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {student.phone ? (
                    <a href={`tel:${student.phone}`} className="hover:text-indigo-600">
                      {student.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No phone registered</span>
                  )}
                </p>
              </div>
            </div>

            {/* Emergency Guardian or Adult Status */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                {student.is_minor || student.guardian_name ? 'Tutor / Representante Legal' : 'Condición del Alumno'}
              </span>
              {student.is_minor || student.guardian_name ? (
                <div className="space-y-1.5">
                  <p className="font-semibold text-slate-900">
                    {student.guardian_name}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {student.guardian_phone ? (
                      <a href={`tel:${student.guardian_phone}`} className="hover:text-indigo-600">
                        {student.guardian_phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Sin teléfono registrado</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Mayor de edad (+18)
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Alumno adulto con contacto directo. No requiere tutor ni representante legal.
                  </p>
                </div>
              )}
            </div>
            {/* Academic Information: Course & School */}
            {(student.course_year || student.school_name) && (
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2 col-span-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Nivel Académico y Centro Educativo
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {student.course_year && (
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Curso / Año</span>
                      <span className="text-xs sm:text-sm font-bold text-indigo-950">{student.course_year}</span>
                    </div>
                  )}
                  {student.school_name && (
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200/80 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Centro / Instituto</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-indigo-500" />
                        {student.school_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Attendance Snapshot */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Academic Attendance Record
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {attendanceRate}% Rate
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Present</span>
                <span className="text-base font-bold text-emerald-700">{presentCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Late</span>
                <span className="text-base font-bold text-amber-700">{lateCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Unexcused</span>
                <span className="text-base font-bold text-rose-700">{absentCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-sky-50/60 border border-sky-100">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Excused</span>
                <span className="text-base font-bold text-sky-700">{excusedCount}</span>
              </div>
            </div>

            {absentCount > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Notice: {absentCount} unexcused absence(s) are recorded as billable in student tuition recibos.
              </p>
            )}
          </div>

          {/* Enrolled Courses */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Active Course Enrollments ({enrolledClasses.length})
            </span>

            {enrolledClasses.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg">
                No active class enrollments currently registered for this student.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {enrolledClasses.map((c) => (
                  <div key={c.id} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{c.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        Instructor: {c.instructor_name || 'N/A'} • Rate: ${c.cost_per_session_cents / 100} / session
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Enrolled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => onEdit(student)}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Profile
          </button>

          <div className="flex items-center gap-2">
            {onGenerateRecibo && (
              <button
                onClick={() => {
                  onGenerateRecibo(student);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                Generate Recibo
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
