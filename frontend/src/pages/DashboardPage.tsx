import { useState, useMemo } from 'react';
import { 
  Users, 
  Receipt, 
  CheckCircle2, 
  DollarSign, 
  Sparkles,
  Info
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { TodaySchedule } from '../components/TodaySchedule';
import { AttendanceSummary } from '../components/AttendanceSummary';
import { RecentInvoices } from '../components/RecentInvoices';
import { StudentListPreview } from '../components/StudentListPreview';
import { OfficialReceiptModal } from '../components/OfficialReceiptModal';
import { AttendanceInvoiceGeneratorModal } from '../components/AttendanceInvoiceGeneratorModal';
import { NewStudentModal } from '../components/NewStudentModal';
import { AttendanceModal } from '../components/AttendanceModal';
import { 
  mockDashboardMetrics, 
  mockTodaySchedule, 
} from '../data/mockData';
import type { 
  EnrichedInvoice, 
  Student, 
  ClassItem,
  EnrichedScheduleItem, 
  DashboardMetrics, 
  AttendanceStatus 
} from '../types';
import { formatCents } from '../utils/formatters';

interface DashboardPageProps {
  searchQuery: string;
  isNewStudentOpen: boolean;
  setIsNewStudentOpen: (open: boolean) => void;
  isNewInvoiceOpen: boolean;
  setIsNewInvoiceOpen: (open: boolean) => void;
  onNavigateTab: (tab: string) => void;
  invoices: EnrichedInvoice[];
  onAddInvoice: (invoice: EnrichedInvoice) => void;
  onMarkInvoicePaid: (id: string) => void;
  students: Student[];
  onAddStudent: (student: Student) => void;
  classes: ClassItem[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  searchQuery,
  isNewStudentOpen,
  setIsNewStudentOpen,
  isNewInvoiceOpen,
  setIsNewInvoiceOpen,
  onNavigateTab,
  invoices,
  onAddInvoice,
  onMarkInvoicePaid,
  students,
  onAddStudent,
  classes,
}) => {
  // Local state for dashboard metrics
  const [metrics, setMetrics] = useState<DashboardMetrics>(mockDashboardMetrics);
  const [schedules] = useState<EnrichedScheduleItem[]>(mockTodaySchedule);

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null);
  const [activeScheduleForAttendance, setActiveScheduleForAttendance] = useState<EnrichedScheduleItem | null>(null);

  // Timeframe selector state
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  // Dynamically compute live revenue & pending receivables from current invoices
  const { totalRevenueCents, pendingCents, overdueCount } = useMemo(() => {
    let rev = 0;
    let pend = 0;
    let od = 0;
    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        rev += inv.total_cents;
      } else if (inv.status === 'overdue') {
        od++;
        pend += inv.total_cents;
      } else if (inv.status === 'pending') {
        pend += inv.total_cents;
      }
    });
    return { totalRevenueCents: rev, pendingCents: pend, overdueCount: od };
  }, [invoices]);

  // Filtered lists based on global search query
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.student_name.toLowerCase().includes(q) ||
        inv.student_email.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (std) =>
        std.first_name.toLowerCase().includes(q) ||
        std.last_name.toLowerCase().includes(q) ||
        std.email.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase();
    return schedules.filter(
      (sch) =>
        sch.class_name.toLowerCase().includes(q) ||
        sch.instructor_name.toLowerCase().includes(q) ||
        (sch.room && sch.room.toLowerCase().includes(q))
    );
  }, [schedules, searchQuery]);

  const handleSaveAttendance = (records: Record<string, AttendanceStatus>) => {
    let presentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let absentCount = 0;

    Object.values(records).forEach((status) => {
      if (status === 'present') presentCount++;
      else if (status === 'late') lateCount++;
      else if (status === 'excused') excusedCount++;
      else if (status === 'absent') absentCount++;
    });

    const total = presentCount + lateCount + excusedCount + absentCount;
    const rate = total ? Math.round(((presentCount + lateCount * 0.8) / total) * 1000) / 10 : 100;

    setMetrics((prev) => ({
      ...prev,
      attendance_rate_today: rate,
      today_attendance_counts: {
        present: presentCount,
        late: lateCount,
        excused: excusedCount,
        absent: absentCount,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Academy Operations Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Live Overview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time enrollment, class scheduling, attendance tracking, and session tuition billing ("recibos").
          </p>
        </div>

        {/* Timeframe pill selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          {(['today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                timeframe === t
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Attendance Billing Callout */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs text-indigo-950">
            <strong>Attendance Billing Rule:</strong> Invoices are calculated by cost per session $\times$ sessions attended. Unexcused absences count as attended and are billed.
          </span>
        </div>
        <button
          onClick={() => onNavigateTab('invoices')}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 transition-colors"
        >
          Open Priority Billing Ledger →
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Active Students"
          value={students.filter((s) => s.status === 'active').length}
          change="+8.3%"
          isPositive={true}
          subtitle={`of ${students.length} registered`}
          icon={Users}
          iconColor="indigo"
        />

        <StatCard
          title="Today's Attendance"
          value={`${metrics.attendance_rate_today}%`}
          change="+1.5%"
          isPositive={true}
          subtitle={`${metrics.today_attendance_counts.present} Present • ${metrics.today_attendance_counts.absent} Absent`}
          icon={CheckCircle2}
          iconColor="emerald"
        />

        <StatCard
          title="Revenue Collected"
          value={formatCents(totalRevenueCents)}
          change="+14.2%"
          isPositive={true}
          subtitle="From paid session receipts"
          icon={DollarSign}
          iconColor="emerald"
        />

        <StatCard
          title="Pending Receivables"
          value={formatCents(pendingCents)}
          change={`${overdueCount} overdue`}
          isPositive={false}
          subtitle="Awaiting parent payment"
          icon={Receipt}
          iconColor="amber"
        />
      </div>

      {/* Main Operational Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop): Today's Schedule & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <TodaySchedule
            schedules={filteredSchedules}
            onTakeAttendance={(item) => setActiveScheduleForAttendance(item)}
            onViewAll={() => onNavigateTab('schedule')}
          />

          {/* Recent Invoices */}
          <RecentInvoices
            invoices={filteredInvoices}
            onViewInvoice={(invoice) => setSelectedInvoice(invoice)}
            onViewAll={() => onNavigateTab('invoices')}
          />
        </div>

        {/* Right Column (1/3 width on desktop): Attendance Summary & Enrolled Students */}
        <div className="space-y-6">
          {/* Attendance Breakdown Card */}
          <AttendanceSummary
            metrics={metrics}
            onOpenAttendanceModal={() => {
              if (schedules.length > 0) {
                setActiveScheduleForAttendance(schedules[0]);
              }
            }}
          />

          {/* Enrolled Students Widget */}
          <StudentListPreview
            students={filteredStudents}
            onViewAll={() => onNavigateTab('students')}
            onSelectStudent={(std) => {
              alert(`Student: ${std.first_name} ${std.last_name}\nEmail: ${std.email}\nGuardian: ${std.guardian_name || 'N/A'}`);
            }}
          />
        </div>
      </div>

      {/* Official Recibo Modal */}
      <OfficialReceiptModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onMarkPaid={onMarkInvoicePaid}
      />

      {/* Session Attendance Invoice Generator Modal */}
      <AttendanceInvoiceGeneratorModal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        onInvoiceCreated={onAddInvoice}
        classes={classes}
        students={students}
      />

      {/* New Student Registration Modal */}
      <NewStudentModal
        isOpen={isNewStudentOpen}
        onClose={() => setIsNewStudentOpen(false)}
        onCreateStudent={onAddStudent}
      />

      {/* Roll-call Attendance Modal */}
      <AttendanceModal
        isOpen={!!activeScheduleForAttendance}
        schedule={activeScheduleForAttendance}
        onClose={() => setActiveScheduleForAttendance(null)}
        onSaveAttendance={handleSaveAttendance}
      />
    </div>
  );
};
