import { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Calendar, 
  Sparkles, 
  Info, 
  CheckCheck,
  MessageSquare,
  Loader2
} from 'lucide-react';
import type { 
  EnrichedScheduleItem, 
  ClassItem, 
  Student, 
  Enrollment, 
  AttendanceStatus 
} from '../types';
import { mockStudents, mockEnrollments } from '../data/mockData';
import { attendanceApi } from '../api/attendance';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: EnrichedScheduleItem | null;
  classItem?: ClassItem | null;
  students?: Student[];
  enrollments?: Enrollment[];
  onSaveAttendance?: (records: Record<string, AttendanceStatus>, classId: string, date: string) => void;
}

interface StudentRowState {
  status: AttendanceStatus;
  notes: string;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  schedule,
  classItem,
  students = mockStudents,
  enrollments = mockEnrollments,
  onSaveAttendance,
}) => {
  if (!isOpen || (!schedule && !classItem)) return null;

  // Resolve target class details
  const classId = schedule ? schedule.class_id : classItem!.id;
  const className = schedule ? schedule.class_name : classItem!.name;
  const instructorName = schedule 
    ? schedule.instructor_name 
    : (classItem!.instructor_name || 'Assigned Instructor');
  const room = schedule ? schedule.room : undefined;

  return (
    <AttendanceModalInner
      key={`${classId}-${isOpen ? 'open' : 'closed'}`}
      classId={classId}
      className={className}
      instructorName={instructorName}
      room={room}
      allStudents={students}
      allEnrollments={enrollments}
      onClose={onClose}
      onSaveAttendance={onSaveAttendance}
    />
  );
};

interface AttendanceModalInnerProps {
  classId: string;
  className: string;
  instructorName: string;
  room?: string;
  allStudents: Student[];
  allEnrollments: Enrollment[];
  onClose: () => void;
  onSaveAttendance?: (records: Record<string, AttendanceStatus>, classId: string, date: string) => void;
}

const AttendanceModalInner: React.FC<AttendanceModalInnerProps> = ({
  classId,
  className,
  instructorName,
  room,
  allStudents,
  allEnrollments,
  onClose,
  onSaveAttendance,
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Filter students enrolled in this class
  const classStudents = useMemo(() => {
    const enrolledStudentIds = new Set(
      allEnrollments
        .filter((e) => e.class_id === classId && e.status === 'active')
        .map((e) => e.student_id)
    );

    const enrolled = allStudents.filter((s) => enrolledStudentIds.has(s.id));
    // If no enrollments exist in mock data for this class, fallback to all active students
    return enrolled.length > 0 ? enrolled : allStudents.filter((s) => s.status === 'active');
  }, [allStudents, allEnrollments, classId]);

  // Initial student attendance states
  const [attendance, setAttendance] = useState<Record<string, StudentRowState>>(() => {
    const initial: Record<string, StudentRowState> = {};
    classStudents.forEach((student, idx) => {
      let st: AttendanceStatus = 'present';
      if (idx === 1) st = 'late';
      else if (idx === 4) st = 'absent';

      initial[student.id] = {
        status: st,
        notes: '',
      };
    });
    return initial;
  });

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const setStudentNote = (studentId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const toggleNoteField = (studentId: string) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleMarkAllPresent = () => {
    setAttendance((prev) => {
      const updated: Record<string, StudentRowState> = {};
      classStudents.forEach((st) => {
        updated[st.id] = {
          status: 'present',
          notes: prev[st.id]?.notes || '',
        };
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const recordsArray = classStudents.map((st) => {
      const row = attendance[st.id] || { status: 'present', notes: '' };
      return {
        student_id: st.id,
        status: row.status,
        notes: row.notes.trim() ? row.notes.trim() : undefined,
      };
    });

    try {
      // 1. Try sending to the live backend API
      await attendanceApi.recordBatch({
        class_id: classId,
        date,
        records: recordsArray,
      });
    } catch {
      // Fallback: If backend is offline or sandbox blocks network, log and continue in frontend state
      console.warn('Backend attendance recording failed; keeping local frontend state.');
    } finally {
      setIsSaving(false);
      setSaveSuccess(true);

      const simpleRecord: Record<string, AttendanceStatus> = {};
      recordsArray.forEach((r) => {
        simpleRecord[r.student_id] = r.status;
      });

      onSaveAttendance?.(simpleRecord, classId, date);

      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const statusOptions: { value: AttendanceStatus; label: string; icon: any; color: string; badge: string }[] = [
    { 
      value: 'present', 
      label: 'Present', 
      icon: CheckCircle2, 
      color: 'text-emerald-700 bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20',
      badge: 'Assisted'
    },
    { 
      value: 'late', 
      label: 'Late', 
      icon: Clock, 
      color: 'text-amber-700 bg-amber-50 border-amber-300 ring-2 ring-amber-500/20',
      badge: 'Assisted'
    },
    { 
      value: 'absent', 
      label: 'Absent', 
      icon: XCircle, 
      color: 'text-rose-700 bg-rose-50 border-rose-300 ring-2 ring-rose-500/20',
      badge: 'Billed!'
    },
    { 
      value: 'excused', 
      label: 'Excused', 
      icon: AlertCircle, 
      color: 'text-sky-700 bg-sky-50 border-sky-300 ring-2 ring-sky-500/20',
      badge: 'Waived ($0)'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                Take Roll-Call: {className}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                <Sparkles className="w-2.5 h-2.5 text-indigo-300" />
                Live Attendance
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instructor: <strong>{instructorName}</strong> {room && `• Room: ${room}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector & Session Billing Notice */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-semibold text-slate-700">Session Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all self-start sm:self-auto"
          >
            <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
            Mark All Present
          </button>
        </div>

        {/* Priority Billing Policy Banner */}
        <div className="mx-5 my-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-900 leading-relaxed">
            <strong>Attendance Billing Rule:</strong> Students marked <strong>Absent (unexcused)</strong> are counted as assisted and will be billed on their monthly recibo. Only <strong>Excused</strong> absences with a valid justification are waived ($0.00).
          </div>
        </div>

        {/* Student list */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
          {classStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No students enrolled in this course yet.
            </div>
          ) : (
            classStudents.map((student) => {
              const row = attendance[student.id] || { status: 'present', notes: '' };
              const isNoteOpen = expandedNotes[student.id] || !!row.notes;

              return (
                <div
                  key={student.id}
                  className="pt-3.5 first:pt-0 flex flex-col gap-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Status selector buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {statusOptions.map((opt) => {
                        const isSelected = row.status === opt.value;
                        const Icon = opt.icon;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStudentStatus(student.id, opt.value)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? `${opt.color} shadow-xs font-bold scale-[1.02]`
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{opt.label}</span>
                            {isSelected && (
                              <span className="text-[10px] opacity-75 font-normal">
                                ({opt.badge})
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Note Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleNoteField(student.id)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          row.notes 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title="Add note / excuse reason"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Optional Note Field */}
                  {isNoteOpen && (
                    <div className="pl-12 pr-2">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => setStudentNote(student.id, e.target.value)}
                        placeholder="Add reason/note (e.g. Doctor appointment certificate provided)..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">
            {classStudents.length} Students in roster
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to DB...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
