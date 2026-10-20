import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Info,
  Sparkles,
  Printer,
  CheckSquare,
  Square,
  Users,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Calendar,
  Zap,
  Check
} from 'lucide-react';
import type { 
  EnrichedInvoice, 
  ClassItem, 
  Student, 
  Enrollment, 
  ClassSchedule, 
  Attendance 
} from '../types';
import { formatCents, formatDate } from '../utils/formatters';
import { calculateStudentAttendanceBilling } from '../utils/billingCalculator';
import { OfficialReceiptModal } from '../components/OfficialReceiptModal';
import { BatchReceiptPrintModal } from '../components/BatchReceiptPrintModal';
import { BatchMultipleWarningModal } from '../components/BatchMultipleWarningModal';
import { AttendanceInvoiceGeneratorModal } from '../components/AttendanceInvoiceGeneratorModal';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface BillingPageProps {
  invoices: EnrichedInvoice[];
  onAddInvoice: (invoice: EnrichedInvoice) => void;
  onAddInvoices?: (invoices: EnrichedInvoice[]) => void;
  onMarkInvoicePaid: (id: string) => void;
  classes?: ClassItem[];
  students?: Student[];
  enrollments?: Enrollment[];
  schedules?: ClassSchedule[];
  attendanceHistory?: Attendance[];
}

export const BillingPage: React.FC<BillingPageProps> = ({
  invoices,
  onAddInvoice,
  onAddInvoices,
  onMarkInvoicePaid,
  classes = [],
  students = [],
  enrollments = [],
  schedules = [],
  attendanceHistory = [],
}) => {
  // Navigation Section: 'group' (Clases Grupales) | 'individual' (Clases Individuales) | 'history' (Historial & Control de Recibos)
  const [activeSection, setActiveSection] = useState<'group' | 'individual' | 'history'>('group');

  // Month navigation (Default to Octubre 2026 matching system seed)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(9); // 0-based: 9 = October

  const selectedMonthString = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const startDate = `${selectedMonthString}-01`;
  const lastDay = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const endDate = `${selectedMonthString}-${String(lastDay).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  // Status Filter in History Tab
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [classTypeFilter, setClassTypeFilter] = useState<'all' | 'group' | 'individual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selections for batch actions
  const [selectedGroupStudentIds, setSelectedGroupStudentIds] = useState<Set<string>>(new Set());
  const [selectedIndividualStudentIds, setSelectedIndividualStudentIds] = useState<Set<string>>(new Set());
  const [selectedHistoryInvoiceIds, setSelectedHistoryInvoiceIds] = useState<Set<string>>(new Set());

  // Modals
  const [viewingReceipt, setViewingReceipt] = useState<EnrichedInvoice | null>(null);
  const [batchPrintInvoices, setBatchPrintInvoices] = useState<EnrichedInvoice[] | null>(null);
  const [batchPrintIncludeBlanks, setBatchPrintIncludeBlanks] = useState(true);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [pendingBatchToPrint, setPendingBatchToPrint] = useState<EnrichedInvoice[] | null>(null);
  const [isSingleGeneratorOpen, setIsSingleGeneratorOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showSuccessNotification = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Split classes into Group vs Individual
  const groupClasses = useMemo(() => {
    return classes.filter((c) => (c.class_type || 'group') === 'group');
  }, [classes]);

  const individualClasses = useMemo(() => {
    return classes.filter((c) => c.class_type === 'individual');
  }, [classes]);

  // Financial KPIs
  const { totalInvoiced, totalCollected, totalPending, totalOverdue, pendingCount, paidCount, overdueCount } = useMemo(() => {
    let invoiced = 0;
    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let pCount = 0;
    let okCount = 0;
    let oCount = 0;

    invoices.forEach((inv) => {
      invoiced += inv.total_cents;
      if (inv.status === 'paid') {
        collected += inv.total_cents;
        okCount++;
      } else if (inv.status === 'overdue') {
        overdue += inv.total_cents;
        pending += inv.total_cents;
        oCount++;
      } else if (inv.status === 'pending') {
        pending += inv.total_cents;
        pCount++;
      }
    });

    return {
      totalInvoiced: invoiced,
      totalCollected: collected,
      totalPending: pending,
      totalOverdue: overdue,
      pendingCount: pCount,
      paidCount: okCount,
      overdueCount: oCount,
    };
  }, [invoices]);

  // Compute Group Classes details for the selected month
  const groupClassesData = useMemo(() => {
    return groupClasses.map((cls) => {
      // 1. Calculate sessions for this class in this month based on schedules
      const classSchedules = schedules.filter((s) => s.class_id === cls.id);
      let sessionCount = 0;
      if (classSchedules.length > 0) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const cur = new Date(start);
        const scheduledDays = new Set(classSchedules.map((s) => s.day_of_week));

        while (cur <= end) {
          const isoDay = cur.getDay() === 0 ? 7 : cur.getDay();
          if (scheduledDays.has(isoDay)) sessionCount++;
          cur.setDate(cur.getDate() + 1);
        }
      }
      if (sessionCount <= 0) sessionCount = 8; // Default 8 sessions/month

      const calculatedMonthlyFee = sessionCount * cls.cost_per_session_cents;

      // 2. Find enrolled students
      const activeEnrollments = enrollments.filter(
        (e) => e.class_id === cls.id && e.status === 'active'
      );

      const enrolledStudents = activeEnrollments
        .map((e) => {
          const st = students.find((s) => s.id === e.student_id);
          if (!st) return null;

          // Check if invoice already issued for this student & class for this month
          const existingInv = invoices.find(
            (inv) =>
              inv.student_id === st.id &&
              inv.issue_date.startsWith(selectedMonthString) &&
              inv.items?.some((item) => item.class_id === cls.id || item.description.includes(cls.name))
          );

          return {
            student: st,
            enrollment: e,
            existingInvoice: existingInv || null,
            sessionCount,
            monthlyFee: calculatedMonthlyFee,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        classItem: cls,
        schedules: classSchedules,
        sessionCount,
        monthlyFee: calculatedMonthlyFee,
        enrolledStudents,
      };
    });
  }, [groupClasses, schedules, enrollments, students, invoices, startDate, endDate, selectedMonthString]);

  // Unique list of all group enrolled students
  const allGroupStudents = useMemo(() => {
    const map = new Map<string, Student>();
    groupClassesData.forEach((cd) => {
      cd.enrolledStudents.forEach((es) => {
        map.set(es.student.id, es.student);
      });
    });
    return Array.from(map.values());
  }, [groupClassesData]);

  // Unique list of unbilled group students (students with no invoice yet for this month)
  const unbilledGroupStudents = useMemo(() => {
    const map = new Map<string, Student>();
    groupClassesData.forEach((cd) => {
      cd.enrolledStudents.forEach((es) => {
        if (!es.existingInvoice) {
          map.set(es.student.id, es.student);
        }
      });
    });
    return Array.from(map.values());
  }, [groupClassesData]);

  // Compute Individual Classes details for the selected month (Attendance driven)
  const individualClassesData = useMemo(() => {
    return individualClasses.map((cls) => {
      const activeEnrollments = enrollments.filter(
        (e) => e.class_id === cls.id && e.status === 'active'
      );

      const enrolledStudents = activeEnrollments
        .map((e) => {
          const st = students.find((s) => s.id === e.student_id);
          if (!st) return null;

          // Attendance roll calls in this month
          const records = attendanceHistory.filter(
            (att) =>
              att.student_id === st.id &&
              att.class_id === cls.id &&
              att.date >= startDate &&
              att.date <= endDate
          );

          let presentCount = 0;
          let lateCount = 0;
          let unexcusedCount = 0;
          let excusedCount = 0;

          records.forEach((att) => {
            if (att.status === 'present') presentCount++;
            else if (att.status === 'late') lateCount++;
            else if (att.status === 'absent') unexcusedCount++;
            else if (att.status === 'excused') excusedCount++;
          });

          const attendedCount = presentCount + lateCount;
          // Unexcused absence is billable per academy rules!
          const billableSessions = attendedCount + unexcusedCount;
          const calculatedFee = billableSessions * cls.cost_per_session_cents;

          // Check if invoice already issued
          const existingInv = invoices.find(
            (inv) =>
              inv.student_id === st.id &&
              inv.issue_date.startsWith(selectedMonthString) &&
              inv.items?.some((item) => item.class_id === cls.id || item.description.includes(cls.name))
          );

          return {
            student: st,
            enrollment: e,
            attendanceRecords: records,
            presentCount,
            lateCount,
            unexcusedCount,
            excusedCount,
            attendedCount,
            billableSessions,
            calculatedFee,
            existingInvoice: existingInv || null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        classItem: cls,
        enrolledStudents,
      };
    });
  }, [individualClasses, enrollments, students, attendanceHistory, invoices, startDate, endDate, selectedMonthString]);

  // Unique list of all individual enrolled students
  const allIndividualStudents = useMemo(() => {
    const map = new Map<string, Student>();
    individualClassesData.forEach((cd) => {
      cd.enrolledStudents.forEach((es) => {
        map.set(es.student.id, es.student);
      });
    });
    return Array.from(map.values());
  }, [individualClassesData]);

  // Unique list of unbilled individual students (students with no invoice yet and with billable sessions)
  const unbilledIndividualStudents = useMemo(() => {
    const map = new Map<string, Student>();
    individualClassesData.forEach((cd) => {
      cd.enrolledStudents.forEach((es) => {
        if (!es.existingInvoice && es.billableSessions > 0) {
          map.set(es.student.id, es.student);
        }
      });
    });
    return Array.from(map.values());
  }, [individualClassesData]);

  // Filtered invoices for the History / Ledger view
  const filteredHistoryInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;

      if (classTypeFilter !== 'all') {
        const hasMatchingType = inv.items?.some((item) => (item.class_type || 'group') === classTypeFilter);
        if (!hasMatchingType) return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.student_name.toLowerCase().includes(q) ||
        inv.student_email.toLowerCase().includes(q) ||
        (inv.guardian_name && inv.guardian_name.toLowerCase().includes(q))
      );
    });
  }, [invoices, filterStatus, classTypeFilter, searchQuery]);

  // Bulk Print Handler with 10-per-A4 and Blank Slips Warning
  const handleTriggerBatchPrint = (invoicesToPrint: EnrichedInvoice[]) => {
    if (invoicesToPrint.length === 0) {
      alert('Por favor selecciona al menos un recibo para imprimir.');
      return;
    }

    if (invoicesToPrint.length % 10 === 0) {
      setBatchPrintInvoices(invoicesToPrint);
      setBatchPrintIncludeBlanks(false);
    } else {
      setPendingBatchToPrint(invoicesToPrint);
      setIsWarningModalOpen(true);
    }
  };

  const handleConfirmPrintWithBlanks = () => {
    if (pendingBatchToPrint) {
      setBatchPrintInvoices(pendingBatchToPrint);
      setBatchPrintIncludeBlanks(true);
    }
    setIsWarningModalOpen(false);
    setPendingBatchToPrint(null);
  };

  // Generate Invoices for Group Students (Handles specific IDs, selected IDs, or all unbilled)
  const handleGenerateGroup = (specificStudentIds?: string[]) => {
    let targetStudents: Student[] = [];

    if (specificStudentIds && specificStudentIds.length > 0) {
      targetStudents = students.filter((s) => specificStudentIds.includes(s.id));
    } else if (selectedGroupStudentIds.size > 0) {
      targetStudents = students.filter((s) => selectedGroupStudentIds.has(s.id));
    } else {
      targetStudents = unbilledGroupStudents;
    }

    if (targetStudents.length === 0) {
      if (allGroupStudents.length === 0) {
        alert('No hay alumnos inscritos en clases grupales.');
      } else {
        alert(`Todos los alumnos inscritos ya tienen su recibo emitido para ${MONTH_NAMES[currentMonthIndex]} ${currentYear}.`);
      }
      return;
    }

    const newInvoices: EnrichedInvoice[] = [];

    targetStudents.forEach((st) => {
      // Check if student already has a group invoice for this month
      const alreadyHas = invoices.some(
        (inv) =>
          inv.student_id === st.id &&
          inv.issue_date.startsWith(selectedMonthString) &&
          inv.items?.some((item) => (item.class_type || 'group') === 'group')
      );
      if (alreadyHas && !specificStudentIds) return;

      const res = calculateStudentAttendanceBilling({
        studentId: st.id,
        startDate,
        endDate,
        enrollments,
        classes,
        attendanceRecords: attendanceHistory,
        schedules,
      });

      if (res.totalBillableSessions <= 0) return;

      const randomSeq = String(invoices.length + newInvoices.length + 1).padStart(4, '0');
      const invoiceNumber = `${currentYear}-${randomSeq}`;

      const groupItems = res.invoiceItems.filter((it) => (it.class_type || 'group') === 'group');
      const groupTotal = groupItems.reduce((acc, it) => acc + it.total_cents, 0);

      if (groupTotal <= 0) return;

      const newInv: EnrichedInvoice = {
        id: `00000000-0000-0000-0004-${randomSeq.padStart(12, '0')}`,
        invoice_number: invoiceNumber,
        student_id: st.id,
        student_name: `${st.first_name} ${st.last_name}`,
        student_email: st.email,
        guardian_name: st.guardian_name,
        guardian_phone: st.guardian_phone,
        issue_date: startDate,
        due_date: `${selectedMonthString}-10`,
        subtotal_cents: groupTotal,
        discount_cents: 0,
        total_cents: groupTotal,
        status: 'pending',
        notes: `Mensualidad ${MONTH_NAMES[currentMonthIndex]} ${currentYear} (Clases Grupales)`,
        created_at: new Date().toISOString(),
        items: groupItems,
      };

      newInvoices.push(newInv);
    });

    if (newInvoices.length === 0) {
      alert('Los alumnos seleccionados ya tienen sus recibos emitidos en este mes.');
      return;
    }

    if (onAddInvoices) {
      onAddInvoices(newInvoices);
    } else {
      newInvoices.forEach(onAddInvoice);
    }

    setSelectedGroupStudentIds(new Set());
    showSuccessNotification(`¡${newInvoices.length} recibos grupales generados con éxito para ${MONTH_NAMES[currentMonthIndex]}!`);
  };

  // Generate Invoices for Individual Students (Handles specific IDs, selected IDs, or all unbilled)
  const handleGenerateIndividual = (specificStudentIds?: string[]) => {
    let targetStudents: Student[] = [];

    if (specificStudentIds && specificStudentIds.length > 0) {
      targetStudents = students.filter((s) => specificStudentIds.includes(s.id));
    } else if (selectedIndividualStudentIds.size > 0) {
      targetStudents = students.filter((s) => selectedIndividualStudentIds.has(s.id));
    } else {
      targetStudents = unbilledIndividualStudents;
    }

    if (targetStudents.length === 0) {
      if (allIndividualStudents.length === 0) {
        alert('No hay alumnos inscritos en clases particulares individuales.');
      } else {
        alert(`Todos los alumnos con asistencia registrada ya tienen su recibo generado para ${MONTH_NAMES[currentMonthIndex]} ${currentYear}.`);
      }
      return;
    }

    const newInvoices: EnrichedInvoice[] = [];

    targetStudents.forEach((st) => {
      const alreadyHas = invoices.some(
        (inv) =>
          inv.student_id === st.id &&
          inv.issue_date.startsWith(selectedMonthString) &&
          inv.items?.some((item) => item.class_type === 'individual')
      );
      if (alreadyHas && !specificStudentIds) return;

      const res = calculateStudentAttendanceBilling({
        studentId: st.id,
        startDate,
        endDate,
        enrollments,
        classes,
        attendanceRecords: attendanceHistory,
        schedules,
      });

      const individualItems = res.invoiceItems.filter((it) => it.class_type === 'individual');
      const individualTotal = individualItems.reduce((acc, it) => acc + it.total_cents, 0);

      if (individualTotal <= 0) return;

      const randomSeq = String(invoices.length + newInvoices.length + 1).padStart(4, '0');
      const invoiceNumber = `${currentYear}-${randomSeq}`;

      const newInv: EnrichedInvoice = {
        id: `00000000-0000-0000-0004-${randomSeq.padStart(12, '0')}`,
        invoice_number: invoiceNumber,
        student_id: st.id,
        student_name: `${st.first_name} ${st.last_name}`,
        student_email: st.email,
        guardian_name: st.guardian_name,
        guardian_phone: st.guardian_phone,
        issue_date: startDate,
        due_date: `${selectedMonthString}-10`,
        subtotal_cents: individualTotal,
        discount_cents: 0,
        total_cents: individualTotal,
        status: 'pending',
        notes: `Liquidación por Asistencia ${MONTH_NAMES[currentMonthIndex]} ${currentYear} (Clases Individuales)`,
        created_at: new Date().toISOString(),
        items: individualItems,
      };

      newInvoices.push(newInv);
    });

    if (newInvoices.length === 0) {
      alert('No se encontraron sesiones asistidas o no justificadas pendientes de facturar para estos alumnos.');
      return;
    }

    if (onAddInvoices) {
      onAddInvoices(newInvoices);
    } else {
      newInvoices.forEach(onAddInvoice);
    }

    setSelectedIndividualStudentIds(new Set());
    showSuccessNotification(`¡${newInvoices.length} recibos individuales generados con éxito por asistencia!`);
  };

  // Print Group Invoices (Selected or All for this month)
  const handlePrintGroupInvoices = () => {
    let targetInvoices: EnrichedInvoice[] = [];
    if (selectedGroupStudentIds.size > 0) {
      targetInvoices = invoices.filter(
        (i) => selectedGroupStudentIds.has(i.student_id) && i.issue_date.startsWith(selectedMonthString)
      );
    } else {
      targetInvoices = invoices.filter(
        (i) => i.issue_date.startsWith(selectedMonthString) && i.items?.some((item) => (item.class_type || 'group') === 'group')
      );
    }

    if (targetInvoices.length === 0) {
      alert('No hay recibos grupales generados para imprimir en este mes. Primero genera los recibos con el botón "Generar".');
      return;
    }

    handleTriggerBatchPrint(targetInvoices);
  };

  // Print Individual Invoices (Selected or All for this month)
  const handlePrintIndividualInvoices = () => {
    let targetInvoices: EnrichedInvoice[] = [];
    if (selectedIndividualStudentIds.size > 0) {
      targetInvoices = invoices.filter(
        (i) => selectedIndividualStudentIds.has(i.student_id) && i.issue_date.startsWith(selectedMonthString)
      );
    } else {
      targetInvoices = invoices.filter(
        (i) => i.issue_date.startsWith(selectedMonthString) && i.items?.some((item) => item.class_type === 'individual')
      );
    }

    if (targetInvoices.length === 0) {
      alert('No hay recibos individuales generados para imprimir en este mes. Primero genera los recibos con el botón "Generar".');
      return;
    }

    handleTriggerBatchPrint(targetInvoices);
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-100 hover:text-white text-xs font-bold px-2 py-1 rounded bg-emerald-600 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Top Banner & Month Navigator */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Facturación & Recibos
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              10 Recibos / Hoja A4
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión independiente para clases grupales (adelantadas) y clases individuales (por asistencia).
          </p>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 self-start lg:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-white hover:shadow-2xs text-slate-600 transition-colors cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1 font-semibold text-slate-800 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>{MONTH_NAMES[currentMonthIndex]} {currentYear}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-white hover:shadow-2xs text-slate-600 transition-colors cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setIsSingleGeneratorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Recibo Personalizado</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Facturado
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 font-mono">
            {formatCents(totalInvoiced)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {invoices.length} recibos oficiales emitidos
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cobrado (Pagado)
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 font-mono">
            {formatCents(totalCollected)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {paidCount} recibos liquidados
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pendiente de Cobro
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700 font-mono">
            {formatCents(totalPending)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {pendingCount} recibos pendientes
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recibos Vencidos
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-700 font-mono">
            {formatCents(totalOverdue)}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-medium">
            {overdueCount} recibos fuera de plazo (5 días)
          </div>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSection('group')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'group'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clases Grupales (Adelantadas)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeSection === 'group' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {groupClasses.length} cursos
          </span>
        </button>

        <button
          onClick={() => setActiveSection('individual')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'individual'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>Clases Individuales (Por Asistencia)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeSection === 'individual' ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {individualClasses.length} cursos
          </span>
        </button>

        <button
          onClick={() => setActiveSection('history')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSection === 'history'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historial & Control de Recibos</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
            activeSection === 'history' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {invoices.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CLASES GRUPALES (FACTURACIÓN ADELANTADA)                       */}
      {/* ========================================================================= */}
      {activeSection === 'group' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Section banner with smart action bar */}
          <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-indigo-950 font-bold block text-sm mb-0.5">
                  Protocolo de Facturación Adelantada para Clases Grupales:
                </strong>
                <span>
                  Las clases grupales se facturan por adelantado a comienzos de mes. El sistema calcula automáticamente el número total de sesiones programadas en <strong>{MONTH_NAMES[currentMonthIndex]} {currentYear}</strong> según el horario semanal del aula.
                </span>

                {/* Status Indicator Pill */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                    unbilledGroupStudents.length > 0
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  }`}>
                    {unbilledGroupStudents.length > 0 ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span><strong>{unbilledGroupStudents.length}</strong> alumno(s) pendiente(s) de emitir recibo</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Todos los alumnos grupales tienen recibo emitido ({allGroupStudents.length})</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Total: {allGroupStudents.length} alumnos inscritos en cursos grupales
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-start lg:self-auto">
              {/* Quick Select Helpers */}
              <div className="flex items-center gap-1.5 text-xs">
                {selectedGroupStudentIds.size > 0 ? (
                  <button
                    onClick={() => setSelectedGroupStudentIds(new Set())}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                  >
                    Deseleccionar ({selectedGroupStudentIds.size})
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        const set = new Set<string>();
                        allGroupStudents.forEach((s) => set.add(s.id));
                        setSelectedGroupStudentIds(set);
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                      title="Seleccionar todos los alumnos"
                    >
                      Seleccionar Todos ({allGroupStudents.length})
                    </button>
                    {unbilledGroupStudents.length > 0 && unbilledGroupStudents.length < allGroupStudents.length && (
                      <button
                        onClick={() => {
                          const set = new Set<string>();
                          unbilledGroupStudents.forEach((s) => set.add(s.id));
                          setSelectedGroupStudentIds(set);
                        }}
                        className="px-3 py-2 bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 font-bold rounded-xl border border-amber-300 cursor-pointer shadow-2xs transition-colors"
                        title="Seleccionar solo los alumnos que aún no tienen recibo emitido"
                      >
                        Solo pendientes ({unbilledGroupStudents.length})
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Primary Action Button: Always active when unbilled exist or items are selected */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateGroup()}
                  disabled={unbilledGroupStudents.length === 0 && selectedGroupStudentIds.size === 0}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {selectedGroupStudentIds.size > 0
                      ? `Generar Recibos Seleccionados (${selectedGroupStudentIds.size})`
                      : unbilledGroupStudents.length > 0
                      ? `Generar Todos los Pendientes (${unbilledGroupStudents.length})`
                      : '✓ Recibos Generados'}
                  </span>
                </button>

                <button
                  onClick={handlePrintGroupInvoices}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Imprimir recibos en cuadrícula de 10 por página A4"
                >
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <span>
                    {selectedGroupStudentIds.size > 0
                      ? `Imprimir (${selectedGroupStudentIds.size})`
                      : 'Imprimir Lote A4'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Group Classes Cards Grid */}
          <div className="space-y-4">
            {groupClassesData.map(({ classItem, sessionCount, monthlyFee, enrolledStudents }) => {
              const allStudentsSelected = enrolledStudents.length > 0 && enrolledStudents.every((e) => selectedGroupStudentIds.has(e.student.id));

              const toggleClassStudents = () => {
                setSelectedGroupStudentIds((prev) => {
                  const next = new Set(prev);
                  if (allStudentsSelected) {
                    enrolledStudents.forEach((e) => next.delete(e.student.id));
                  } else {
                    enrolledStudents.forEach((e) => next.add(e.student.id));
                  }
                  return next;
                });
              };

              return (
                <div key={classItem.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  {/* Card Header */}
                  <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleClassStudents}
                        className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                        title={allStudentsSelected ? 'Deseleccionar clase' : 'Seleccionar todos en esta clase'}
                      >
                        {allStudentsSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                            {classItem.name}
                          </h3>
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                            Grupal
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Profesor: <strong>{classItem.instructor_name}</strong> • Capacidad: {classItem.capacity} alumnos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-slate-500 block text-[11px]">Tarifa calculada {MONTH_NAMES[currentMonthIndex]}</span>
                        <span className="font-mono text-indigo-700 font-bold text-sm">
                          {sessionCount} sesiones × {formatCents(classItem.cost_per_session_cents)} = {formatCents(monthlyFee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Students Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/40 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center"></th>
                          <th className="py-2.5 px-4">Alumno & Contacto</th>
                          <th className="py-2.5 px-4">Tutor Legal</th>
                          <th className="py-2.5 px-4">Sesiones Mes</th>
                          <th className="py-2.5 px-4">Estado Recibo</th>
                          <th className="py-2.5 px-4 text-right">Importe</th>
                          <th className="py-2.5 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {enrolledStudents.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400">
                              No hay alumnos inscritos en este curso grupal.
                            </td>
                          </tr>
                        ) : (
                          enrolledStudents.map(({ student, existingInvoice, sessionCount: sc, monthlyFee: fee }) => {
                            const isChecked = selectedGroupStudentIds.has(student.id);

                            return (
                              <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/30' : ''}`}>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedGroupStudentIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(student.id)) next.delete(student.id);
                                        else next.add(student.id);
                                        return next;
                                      });
                                    }}
                                    className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>

                                <td className="py-2.5 px-4">
                                  <span className="font-semibold text-slate-900 block">
                                    {student.first_name} {student.last_name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {student.email}
                                  </span>
                                </td>

                                <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                                  {student.guardian_name ? (
                                    `${student.guardian_name} (${student.guardian_phone || 'Tutor'})`
                                  ) : (
                                    <span className="text-slate-400 italic">Mayor de edad (+18)</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-slate-700">
                                  <strong>{sc} sesiones</strong> (horario regular)
                                </td>

                                <td className="py-2.5 px-4">
                                  {existingInvoice ? (
                                    existingInvoice.status === 'paid' ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Emitido (Pagado)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        <Clock className="w-3 h-3" />
                                        Emitido #{existingInvoice.invoice_number}
                                      </span>
                                    )
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      Pendiente de emitir
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                  {formatCents(fee)}
                                </td>

                                <td className="py-2.5 px-4 text-right">
                                  {existingInvoice ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => setViewingReceipt(existingInvoice)}
                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                      >
                                        Ver Recibo
                                      </button>
                                      {existingInvoice.status !== 'paid' && (
                                        <button
                                          onClick={() => {
                                            onMarkInvoicePaid(existingInvoice.id);
                                            showSuccessNotification(`Recibo #${existingInvoice.invoice_number} marcado como Pagado.`);
                                          }}
                                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                          <Zap className="w-3 h-3" />
                                          Cobrar
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleGenerateGroup([student.id])}
                                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ml-auto shadow-2xs"
                                    >
                                      <Zap className="w-3 h-3" />
                                      Emitir Cuota
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CLASES INDIVIDUALES (FACTURACIÓN POR ASISTENCIA)               */}
      {/* ========================================================================= */}
      {activeSection === 'individual' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Section banner with smart action bar */}
          <div className="p-5 rounded-2xl bg-purple-50/80 border border-purple-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-purple-950 font-bold block text-sm mb-0.5">
                  Reglamento de Facturación por Asistencia (Clases Particulares):
                </strong>
                <span>
                  Las clases individuales se liquidan según el parte de asistencia en <strong>{MONTH_NAMES[currentMonthIndex]} {currentYear}</strong>. 
                  <span className="text-purple-900 font-semibold"> Las inasistencias sin avisar (faltas no justificadas) cuentan como asistidas y son facturadas</span>, mientras que las ausencias justificadas con volante médico quedan exentas de cobro.
                </span>

                {/* Status Indicator Pill */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                    unbilledIndividualStudents.length > 0
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  }`}>
                    {unbilledIndividualStudents.length > 0 ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span><strong>{unbilledIndividualStudents.length}</strong> alumno(s) particular(es) pendiente(s) de emitir recibo</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Todos los alumnos particulares tienen recibo emitido ({allIndividualStudents.length})</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Total: {allIndividualStudents.length} alumnos inscritos en clases particulares
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-start lg:self-auto">
              {/* Quick Select Helpers */}
              <div className="flex items-center gap-1.5 text-xs">
                {selectedIndividualStudentIds.size > 0 ? (
                  <button
                    onClick={() => setSelectedIndividualStudentIds(new Set())}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                  >
                    Deseleccionar ({selectedIndividualStudentIds.size})
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        const set = new Set<string>();
                        allIndividualStudents.forEach((s) => set.add(s.id));
                        setSelectedIndividualStudentIds(set);
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 cursor-pointer shadow-2xs transition-colors"
                    >
                      Seleccionar Todos ({allIndividualStudents.length})
                    </button>
                    {unbilledIndividualStudents.length > 0 && unbilledIndividualStudents.length < allIndividualStudents.length && (
                      <button
                        onClick={() => {
                          const set = new Set<string>();
                          unbilledIndividualStudents.forEach((s) => set.add(s.id));
                          setSelectedIndividualStudentIds(set);
                        }}
                        className="px-3 py-2 bg-amber-100/80 hover:bg-amber-200/80 text-amber-900 font-bold rounded-xl border border-amber-300 cursor-pointer shadow-2xs transition-colors"
                      >
                        Solo pendientes ({unbilledIndividualStudents.length})
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateIndividual()}
                  disabled={unbilledIndividualStudents.length === 0 && selectedIndividualStudentIds.size === 0}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {selectedIndividualStudentIds.size > 0
                      ? `Generar Recibos Seleccionados (${selectedIndividualStudentIds.size})`
                      : unbilledIndividualStudents.length > 0
                      ? `Generar Todos los Pendientes (${unbilledIndividualStudents.length})`
                      : '✓ Recibos Generados'}
                  </span>
                </button>

                <button
                  onClick={handlePrintIndividualInvoices}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Imprimir recibos en cuadrícula de 10 por página A4"
                >
                  <Printer className="w-4 h-4 text-purple-600" />
                  <span>
                    {selectedIndividualStudentIds.size > 0
                      ? `Imprimir (${selectedIndividualStudentIds.size})`
                      : 'Imprimir Lote A4'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Individual Classes Table */}
          <div className="space-y-4">
            {individualClassesData.map(({ classItem, enrolledStudents }) => {
              const allStudentsSelected = enrolledStudents.length > 0 && enrolledStudents.every((e) => selectedIndividualStudentIds.has(e.student.id));

              const toggleClassStudents = () => {
                setSelectedIndividualStudentIds((prev) => {
                  const next = new Set(prev);
                  if (allStudentsSelected) {
                    enrolledStudents.forEach((e) => next.delete(e.student.id));
                  } else {
                    enrolledStudents.forEach((e) => next.add(e.student.id));
                  }
                  return next;
                });
              };

              return (
                <div key={classItem.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={toggleClassStudents}
                        className="text-slate-400 hover:text-purple-600 cursor-pointer"
                        title={allStudentsSelected ? 'Deseleccionar clase' : 'Seleccionar todos en esta clase'}
                      >
                        {allStudentsSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                            {classItem.name}
                          </h3>
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            Individual / Particular
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Profesor: <strong>{classItem.instructor_name}</strong> • Tarifa por sesión: <strong>{formatCents(classItem.cost_per_session_cents)}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs font-semibold">
                      <span className="text-slate-500 block text-[11px]">Modalidad</span>
                      <span className="text-purple-700 font-bold">Liquidación por Asistencia</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/40 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center"></th>
                          <th className="py-2.5 px-4">Alumno & Contacto</th>
                          <th className="py-2.5 px-4 text-center">Asistidas</th>
                          <th className="py-2.5 px-4 text-center">Falta No Justificada (Cobrada)</th>
                          <th className="py-2.5 px-4 text-center">Justificada (Exenta)</th>
                          <th className="py-2.5 px-4 text-center">Total Facturable</th>
                          <th className="py-2.5 px-4">Estado Recibo</th>
                          <th className="py-2.5 px-4 text-right">Importe Total</th>
                          <th className="py-2.5 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {enrolledStudents.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-4 text-center text-slate-400">
                              No hay alumnos inscritos en esta clase individual.
                            </td>
                          </tr>
                        ) : (
                          enrolledStudents.map(({ 
                            student, 
                            attendedCount, 
                            unexcusedCount, 
                            excusedCount, 
                            billableSessions, 
                            calculatedFee, 
                            existingInvoice 
                          }) => {
                            const isChecked = selectedIndividualStudentIds.has(student.id);

                            return (
                              <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-purple-50/30' : ''}`}>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedIndividualStudentIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(student.id)) next.delete(student.id);
                                        else next.add(student.id);
                                        return next;
                                      });
                                    }}
                                    className="text-slate-400 hover:text-purple-600 cursor-pointer"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-purple-600" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>

                                <td className="py-2.5 px-4">
                                  <span className="font-semibold text-slate-900 block">
                                    {student.first_name} {student.last_name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {student.email}
                                  </span>
                                </td>

                                <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                                  {attendedCount}
                                </td>

                                <td className="py-2.5 px-4 text-center">
                                  {unexcusedCount > 0 ? (
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[11px]">
                                      +{unexcusedCount} facturada(s)
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-center">
                                  {excusedCount > 0 ? (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]">
                                      {excusedCount} exenta(s)
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-center font-mono font-bold text-purple-900">
                                  {billableSessions} sesiones
                                </td>

                                <td className="py-2.5 px-4">
                                  {existingInvoice ? (
                                    existingInvoice.status === 'paid' ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Pagado
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                        <Clock className="w-3 h-3" />
                                        Emitido #{existingInvoice.invoice_number}
                                      </span>
                                    )
                                  ) : billableSessions > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      Pendiente de emitir
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">
                                      Sin asistencia registrada
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                                  {formatCents(calculatedFee)}
                                </td>

                                <td className="py-2.5 px-4 text-right">
                                  {existingInvoice ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => setViewingReceipt(existingInvoice)}
                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                      >
                                        Ver Recibo
                                      </button>
                                      {existingInvoice.status !== 'paid' && (
                                        <button
                                          onClick={() => {
                                            onMarkInvoicePaid(existingInvoice.id);
                                            showSuccessNotification(`Recibo #${existingInvoice.invoice_number} marcado como Pagado.`);
                                          }}
                                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                          <Zap className="w-3 h-3" />
                                          Cobrar
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      disabled={billableSessions === 0}
                                      onClick={() => handleGenerateIndividual([student.id])}
                                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ml-auto shadow-2xs"
                                    >
                                      <Zap className="w-3 h-3" />
                                      Emitir Recibo
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: HISTORIAL & CONTROL DE RECIBOS (FILTROS Y COBRO RÁPIDO)         */}
      {/* ========================================================================= */}
      {activeSection === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Toolbar: Status Filter Tabs + Search */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({invoices.length})
                </button>

                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendientes ({pendingCount})</span>
                </button>

                <button
                  onClick={() => setFilterStatus('paid')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'paid'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pagados ({paidCount})</span>
                </button>

                <button
                  onClick={() => setFilterStatus('overdue')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'overdue'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Vencidos ({overdueCount})</span>
                </button>
              </div>

              {/* Search & Modality Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={classTypeFilter}
                  onChange={(e) => setClassTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">Todas las modalidades</option>
                  <option value="group">Solo Clases Grupales</option>
                  <option value="individual">Solo Clases Individuales</option>
                </select>

                <div className="relative w-full sm:w-60">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar alumno, recibo #..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Print Selection Bar */}
            {selectedHistoryInvoiceIds.size > 0 && (
              <div className="bg-indigo-50/90 border-b border-indigo-100 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-bold">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>{selectedHistoryInvoiceIds.size} recibo(s) seleccionado(s)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const selectedList = invoices.filter((i) => selectedHistoryInvoiceIds.has(i.id));
                      handleTriggerBatchPrint(selectedList);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir en Lote A4 (10 por hoja)</span>
                  </button>

                  <button
                    onClick={() => setSelectedHistoryInvoiceIds(new Set())}
                    className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = filteredHistoryInvoices.length > 0 && filteredHistoryInvoices.every((i) => selectedHistoryInvoiceIds.has(i.id));
                          if (allSelected) {
                            setSelectedHistoryInvoiceIds(new Set());
                          } else {
                            const next = new Set(selectedHistoryInvoiceIds);
                            filteredHistoryInvoices.forEach((i) => next.add(i.id));
                            setSelectedHistoryInvoiceIds(next);
                          }
                        }}
                        className="text-slate-400 hover:text-indigo-600 cursor-pointer flex items-center justify-center mx-auto"
                      >
                        {filteredHistoryInvoices.length > 0 && filteredHistoryInvoices.every((i) => selectedHistoryInvoiceIds.has(i.id)) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Nº Recibo</th>
                    <th className="py-3 px-4">Alumno & Tutor</th>
                    <th className="py-3 px-4">Concepto / Modalidad</th>
                    <th className="py-3 px-4">Vencimiento</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Importe Total</th>
                    <th className="py-3 px-5 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                        No se encontraron recibos con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryInvoices.map((inv) => {
                      const isChecked = selectedHistoryInvoiceIds.has(inv.id);
                      const hasGroup = inv.items?.some((i) => (i.class_type || 'group') === 'group');
                      const hasIndividual = inv.items?.some((i) => i.class_type === 'individual');

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHistoryInvoiceIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(inv.id)) next.delete(inv.id);
                                  else next.add(inv.id);
                                  return next;
                                });
                              }}
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer flex items-center justify-center mx-auto"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                            {inv.invoice_number}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 block text-xs sm:text-sm">
                              {inv.student_name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {inv.guardian_name ? `Tutor: ${inv.guardian_name}` : 'Mayor de edad (+18)'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {hasGroup && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Grupal (Adelantado)
                                </span>
                              )}
                              {hasIndividual && (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200">
                                  Individual (Asistencia)
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-600 line-clamp-1">
                              {inv.items?.[0]?.description || inv.notes || 'Mensualidad'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {formatDate(inv.due_date)}
                          </td>

                          <td className="py-3.5 px-4">
                            {inv.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <CheckCircle2 className="w-3 h-3" />
                                Pagado
                              </span>
                            ) : inv.status === 'overdue' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                Vencido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm sm:text-base">
                            {formatCents(inv.total_cents)}
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Fast Pay Action Button */}
                              {inv.status !== 'paid' ? (
                                <button
                                  onClick={() => {
                                    onMarkInvoicePaid(inv.id);
                                    showSuccessNotification(`¡Recibo #${inv.invoice_number} marcado como Pagado!`);
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Marcar como cobrado inmediatamente"
                                >
                                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Cobrar</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-700 font-semibold px-2 py-0.5 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Cobrado
                                </span>
                              )}

                              {/* View / Print Single Slip */}
                              <button
                                onClick={() => setViewingReceipt(inv)}
                                className="px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Ver recibo oficial ENCINA"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Recibo</span>
                              </button>

                              <button
                                onClick={() => {
                                  setBatchPrintInvoices([inv]);
                                  setBatchPrintIncludeBlanks(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Imprimir en hoja A4 (10 por hoja con huecos)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong>{filteredHistoryInvoices.length}</strong> de {invoices.length} recibos
              </span>
              <span>
                Formato conforme a normativa de Academia Encina (10 recibos por página A4)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Viewer (Single Slip) */}
      <OfficialReceiptModal
        invoice={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        onMarkPaid={(id) => {
          onMarkInvoicePaid(id);
          showSuccessNotification('Recibo marcado como pagado.');
        }}
      />

      {/* Batch Receipt Print Modal (10 per A4 page grid with blank fillers) */}
      {batchPrintInvoices && (
        <BatchReceiptPrintModal
          invoices={batchPrintInvoices}
          initialIncludeBlanks={batchPrintIncludeBlanks}
          onClose={() => setBatchPrintInvoices(null)}
        />
      )}

      {/* Warning Modal when selected count is not multiple of 10 */}
      <BatchMultipleWarningModal
        isOpen={isWarningModalOpen}
        selectedCount={pendingBatchToPrint ? pendingBatchToPrint.length : 0}
        onClose={() => {
          setIsWarningModalOpen(false);
          setPendingBatchToPrint(null);
        }}
        onConfirmWithBlanks={handleConfirmPrintWithBlanks}
      />

      {/* Custom Attendance Invoice Generator Modal */}
      <AttendanceInvoiceGeneratorModal
        isOpen={isSingleGeneratorOpen}
        onClose={() => setIsSingleGeneratorOpen(false)}
        onInvoiceCreated={(newInv) => {
          onAddInvoice(newInv);
          showSuccessNotification(`Recibo #${newInv.invoice_number} creado con éxito.`);
        }}
        classes={classes}
        students={students}
      />
    </div>
  );
};
