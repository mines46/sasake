import { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Users, 
  DollarSign, 
  Clock, 
  Edit3, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  Info
} from 'lucide-react';
import type { ClassItem, Enrollment, Student, ClassSchedule } from '../types';
import { formatCents, formatTime, getDayName } from '../utils/formatters';
import { NewClassModal } from '../components/NewClassModal';
import { ClassDetailModal } from '../components/ClassDetailModal';
import { AttendanceModal } from '../components/AttendanceModal';

interface ClassesPageProps {
  classes: ClassItem[];
  onAddClass: (cls: ClassItem) => void;
  onUpdateClass: (cls: ClassItem) => void;
  enrollments: Enrollment[];
  students: Student[];
  schedules: ClassSchedule[];
  onTakeAttendance?: (cls: ClassItem) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({
  classes,
  onAddClass,
  onUpdateClass,
  enrollments,
  students,
  schedules,
  onTakeAttendance,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<ClassItem | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassItem | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<ClassItem | null>(null);

  const handleTakeAttendance = (cls: ClassItem) => {
    if (onTakeAttendance) {
      onTakeAttendance(cls);
    } else {
      setAttendanceClass(cls);
    }
  };

  // Key KPI stats
  const { totalClasses, activeCount, totalSeats, totalEnrolledSeats, avgSessionPriceCents } = useMemo(() => {
    let active = 0;
    let seats = 0;
    let enrolled = 0;
    let sumSessionCents = 0;

    classes.forEach((c) => {
      if (c.is_active) active++;
      seats += c.capacity;
      sumSessionCents += c.cost_per_session_cents;

      const cEnrolled = enrollments.filter(
        (e) => e.class_id === c.id && e.status === 'active'
      ).length;
      enrolled += cEnrolled;
    });

    const avg = classes.length ? Math.round(sumSessionCents / classes.length) : 0;

    return {
      totalClasses: classes.length,
      activeCount: active,
      totalSeats: seats,
      totalEnrolledSeats: enrolled,
      avgSessionPriceCents: avg,
    };
  }, [classes, enrollments]);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'archived' && c.is_active) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchInstructor = (c.instructor_name && c.instructor_name.toLowerCase().includes(q)) || false;
      const matchDesc = (c.description && c.description.toLowerCase().includes(q)) || false;

      return matchName || matchInstructor || matchDesc;
    });
  }, [classes, statusFilter, searchQuery]);

  const handleSaveClass = (saved: ClassItem) => {
    const exists = classes.some((c) => c.id === saved.id);
    if (exists) {
      onUpdateClass(saved);
    } else {
      onAddClass(saved);
    }
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setClassToEdit(cls);
    setIsNewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Classes & Curriculum Management
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              {activeCount} Active Courses
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Configure course subjects, instructor assignments, capacities, and base tuition rates per session for attendance recibos.
          </p>
        </div>

        <button
          onClick={() => {
            setClassToEdit(null);
            setIsNewModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Class</span>
        </button>
      </div>

      {/* Priority Session Pricing Info Callout */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/60 border border-indigo-100 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <strong>Session Billing Configuration:</strong> The <em>Cost per Session</em> defined on each class is directly used by the Billing Engine. When generating student invoices, the system charges this amount for each session attended plus unexcused absences.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Courses
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {totalClasses}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {activeCount} active • {totalClasses - activeCount} archived
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Enrolled Seats
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">
            {totalEnrolledSeats}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            of {totalSeats} total seat capacity ({totalSeats ? Math.round((totalEnrolledSeats / totalSeats) * 100) : 0}%)
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg Cost / Session
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-indigo-600 font-mono">
            {formatCents(avgSessionPriceCents)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Standard attendance billing unit
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available Seats
            </span>
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-sky-700">
            {Math.max(0, totalSeats - totalEnrolledSeats)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Open for student enrollment
          </div>
        </div>
      </div>

      {/* Classes Toolbar & Grid */}
      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {(['all', 'active', 'archived'] as const).map((tab) => (
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
              placeholder="Search classes, instructor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Classes Cards Grid */}
        {filteredClasses.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            No classes found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls) => {
              const enrolledCount = enrollments.filter(
                (e) => e.class_id === cls.id && e.status === 'active'
              ).length;
              const fillRatio = Math.round((enrolledCount / cls.capacity) * 100);
              const isNearCapacity = fillRatio >= 90;
              const classSchedules = schedules.filter((s) => s.class_id === cls.id);

              return (
                <div
                  key={cls.id}
                  onClick={() => setViewingClass(cls)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Status badge, Modality & Rate */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            cls.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {cls.is_active ? 'Active' : 'Archived'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            cls.class_type === 'individual'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                          title={
                            cls.class_type === 'individual'
                              ? 'Clase Individual: cobro según asistencia'
                              : 'Clase Grupal: cobro mensual por adelantado'
                          }
                        >
                          {cls.class_type === 'individual' ? 'Individual' : 'Grupal (Adelantado)'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-indigo-600 font-mono">
                          {formatCents(cls.cost_per_session_cents)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">/ session</span>
                      </div>
                    </div>

                    {/* Class Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {cls.description || 'Comprehensive academy coursework with guided instruction and practical sessions.'}
                      </p>
                    </div>

                    {/* Instructor & Timetable preview */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Instructor: <strong className="text-slate-800">{cls.instructor_name || 'Unassigned'}</strong></span>
                      </div>

                      {classSchedules.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {getDayName(classSchedules[0].day_of_week).substring(0, 3)} • {formatTime(classSchedules[0].start_time)} – {formatTime(classSchedules[0].end_time)}
                            {classSchedules[0].room && ` (${classSchedules[0].room})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Capacity bar & Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-1">
                        <span className="text-slate-500">Class Enrollment</span>
                        <span className={isNearCapacity ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                          {enrolledCount} / {cls.capacity} seats ({fillRatio}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isNearCapacity ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(fillRatio, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(cls);
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTakeAttendance(cls);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                          Attendance
                        </button>

                        <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Class Modal */}
      <NewClassModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setClassToEdit(null);
        }}
        onCreateClass={handleSaveClass}
        classToEdit={classToEdit}
      />

      {/* Class Detail & Roster Modal */}
      <ClassDetailModal
        classItem={viewingClass}
        onClose={() => setViewingClass(null)}
        onEdit={(cls) => {
          setViewingClass(null);
          handleOpenEdit(cls);
        }}
        onTakeAttendance={handleTakeAttendance}
        enrollments={enrollments}
        students={students}
        schedules={schedules}
      />

      {/* Roll-call Attendance Modal */}
      <AttendanceModal
        isOpen={!!attendanceClass}
        classItem={attendanceClass}
        students={students}
        enrollments={enrollments}
        onClose={() => setAttendanceClass(null)}
      />
    </div>
  );
};
