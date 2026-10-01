import { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Edit3, 
  Receipt, 
  Sparkles, 
  UserCheck
} from 'lucide-react';
import type { Student, ClassItem, Enrollment, Attendance, StudentStatus } from '../types';
import { formatDate } from '../utils/formatters';
import { NewStudentModal } from '../components/NewStudentModal';
import { StudentDetailModal } from '../components/StudentDetailModal';

interface StudentsPageProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  classes: ClassItem[];
  enrollments: Enrollment[];
  attendanceHistory: Attendance[];
  onNavigateToBilling?: (studentId: string) => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  classes,
  enrollments,
  attendanceHistory,
  onNavigateToBilling,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');
  
  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  // Student metrics
  const { totalStudents, activeCount, inactiveCount, withGuardiansCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let withGuardians = 0;

    students.forEach((s) => {
      if (s.status === 'active') active++;
      else inactive++;
      if (s.guardian_name || s.guardian_phone) withGuardians++;
    });

    return {
      totalStudents: students.length,
      activeCount: active,
      inactiveCount: inactive,
      withGuardiansCount: withGuardians,
    };
  }, [students]);

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.guardian_name && s.guardian_name.toLowerCase().includes(q))
      );
    });
  }, [students, statusFilter, searchQuery]);

  const handleSaveStudent = (saved: Student) => {
    const exists = students.some((s) => s.id === saved.id);
    if (exists) {
      onUpdateStudent(saved);
    } else {
      onAddStudent(saved);
    }
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setIsNewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Students & Guardian Directory
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              {activeCount} Active Roster
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Manage student registrations, emergency guardian contact details, and view attendance and billing readiness.
          </p>
        </div>

        <button
          onClick={() => {
            setStudentToEdit(null);
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all self-start md:self-auto shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Students
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {totalStudents}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Enrolled across all academy courses
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Roster
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">
            {activeCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Regularly attending classes
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Emergency Contacts
            </span>
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-sky-700">
            {withGuardiansCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Guardians linked to profiles
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inactive / Paused
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-700">
            {inactiveCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            On academic leave or suspended
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Search & Status Filters */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {(['all', 'active', 'inactive', 'suspended'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, guardian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Student</th>
                <th className="py-3 px-4">Direct Contact</th>
                <th className="py-3 px-4">Guardian Emergency Info</th>
                <th className="py-3 px-4">Enrollments</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentEnrolls = enrollments.filter(
                    (e) => e.student_id === student.id && e.status === 'active'
                  );
                  const enrolledCount = studentEnrolls.length;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setViewingStudent(student)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Joined {formatDate(student.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Direct Contact */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]">{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Guardian Emergency Contact */}
                      <td className="py-3.5 px-4 text-xs">
                        {student.guardian_name ? (
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                              {student.guardian_name}
                            </div>
                            {student.guardian_phone && (
                              <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {student.guardian_phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No guardian on file</span>
                        )}
                      </td>

                      {/* Enrolled Courses */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {enrolledCount} {enrolledCount === 1 ? 'class' : 'classes'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {student.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Active
                          </span>
                        ) : student.status === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(student);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {onNavigateToBilling && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToBilling(student.id);
                              }}
                              className="px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1"
                              title="Generate Attendance Recibo"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Recibo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filteredStudents.length}</strong> of {students.length} students
          </span>
          <span>
            Click student row for full profile, attendance, and guardian details
          </span>
        </div>
      </div>

      {/* New / Edit Student Modal */}
      <NewStudentModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setStudentToEdit(null);
        }}
        onCreateStudent={handleSaveStudent}
        studentToEdit={studentToEdit}
      />

      {/* Student Detail Drawer Modal */}
      <StudentDetailModal
        student={viewingStudent}
        onClose={() => setViewingStudent(null)}
        onEdit={(student) => {
          setViewingStudent(null);
          handleOpenEdit(student);
        }}
        onGenerateRecibo={onNavigateToBilling ? (s) => onNavigateToBilling(s.id) : undefined}
        enrollments={enrollments}
        classes={classes}
        attendanceHistory={attendanceHistory}
      />
    </div>
  );
};
