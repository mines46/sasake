import type { 
  Attendance, 
  ClassItem, 
  Enrollment, 
  InvoiceItem, 
  SessionBillingBreakdown,
  ClassSchedule 
} from '../types';

export interface BillingCalculationResult {
  classesBreakdown: SessionBillingBreakdown[];
  invoiceItems: InvoiceItem[];
  totalBillableSessions: number;
  totalAttendedSessions: number;
  totalUnexcusedAbsences: number;
  totalExcusedAbsences: number;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
}

/**
 * Calculates a student's invoice ("recibo"):
 * - GROUP classes: Billed in advance. Charges all sessions scheduled in the month.
 * - INDIVIDUAL classes: Billed based on attendance (attended + unexcused absences).
 */
export function calculateStudentAttendanceBilling(params: {
  studentId: string;
  startDate: string;
  endDate: string;
  enrollments: Enrollment[];
  classes: ClassItem[];
  attendanceRecords: Attendance[];
  schedules?: ClassSchedule[];
  discountCents?: number;
}): BillingCalculationResult {
  const {
    studentId,
    startDate,
    endDate,
    enrollments,
    classes,
    attendanceRecords,
    schedules = [],
    discountCents = 0,
  } = params;

  // Find all active enrolled class IDs for this student
  const studentEnrollments = enrollments.filter(
    (e) => e.student_id === studentId && e.status === 'active'
  );

  const classesBreakdown: SessionBillingBreakdown[] = [];
  const invoiceItems: InvoiceItem[] = [];

  let totalBillableSessions = 0;
  let totalAttendedSessions = 0;
  let totalUnexcusedAbsences = 0;
  let totalExcusedAbsences = 0;
  let subtotal_cents = 0;

  studentEnrollments.forEach((enrollment) => {
    const classItem = classes.find((c) => c.id === enrollment.class_id);
    if (!classItem) return;

    const isGroup = (classItem.class_type || 'group') === 'group';

    if (isGroup) {
      // 1. GROUP CLASS: Generated in advance, charges all sessions in the month
      let scheduledCount = 0;
      const classSchedules = schedules.filter((s) => s.class_id === classItem.id);

      if (classSchedules.length > 0) {
        // Count matching weekdays between startDate and endDate
        const start = new Date(startDate);
        const end = new Date(endDate);
        const cur = new Date(start);

        const scheduledDays = new Set(classSchedules.map((s) => s.day_of_week));

        while (cur <= end) {
          // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
          // ISO Day: 1 is Monday ... 7 is Sunday
          const isoDay = cur.getDay() === 0 ? 7 : cur.getDay();
          if (scheduledDays.has(isoDay)) {
            scheduledCount++;
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      if (scheduledCount <= 0) {
        if (
          classItem.price_cents > 0 &&
          classItem.cost_per_session_cents > 0 &&
          classItem.price_cents % classItem.cost_per_session_cents === 0
        ) {
          scheduledCount = classItem.price_cents / classItem.cost_per_session_cents;
        } else {
          scheduledCount = 8; // Standard 8 sessions per month
        }
      }

      const billable_sessions = scheduledCount;
      const classTotalCents = billable_sessions * classItem.cost_per_session_cents;

      totalBillableSessions += billable_sessions;
      subtotal_cents += classTotalCents;

      const breakdown: SessionBillingBreakdown = {
        class_id: classItem.id,
        class_name: classItem.name,
        class_type: 'group',
        is_advance_billing: true,
        cost_per_session_cents: classItem.cost_per_session_cents,
        present_count: 0,
        late_count: 0,
        unexcused_absent_count: 0,
        excused_count: 0,
        billable_sessions,
        total_cents: classTotalCents,
      };

      classesBreakdown.push(breakdown);

      const description = `${classItem.name} (Grupal) — Cuota mensual adelantada (${billable_sessions} sesiones)`;

      invoiceItems.push({
        id: `item-${Date.now()}-${classItem.id.substring(0, 4)}`,
        invoice_id: '',
        class_id: classItem.id,
        class_type: 'group',
        is_advance_billing: true,
        description,
        quantity: billable_sessions,
        unit_price_cents: classItem.cost_per_session_cents,
        total_cents: classTotalCents,
        present_count: 0,
        late_count: 0,
        unexcused_absent_count: 0,
        excused_count: 0,
      });
    } else {
      // 2. INDIVIDUAL CLASS: Billed based on student attendance records
      const classAttendance = attendanceRecords.filter((att) => {
        if (att.student_id !== studentId || att.class_id !== classItem.id) {
          return false;
        }
        return att.date >= startDate && att.date <= endDate;
      });

      let present_count = 0;
      let late_count = 0;
      let unexcused_absent_count = 0;
      let excused_count = 0;

      classAttendance.forEach((att) => {
        switch (att.status) {
          case 'present':
            present_count++;
            break;
          case 'late':
            late_count++;
            break;
          case 'absent':
            // Critical rule: unexcused absence counts as assisted and is billed!
            unexcused_absent_count++;
            break;
          case 'excused':
            excused_count++;
            break;
        }
      });

      const attended = present_count + late_count;
      const billable_sessions = attended + unexcused_absent_count;
      const classTotalCents = billable_sessions * classItem.cost_per_session_cents;

      totalAttendedSessions += attended;
      totalUnexcusedAbsences += unexcused_absent_count;
      totalExcusedAbsences += excused_count;
      totalBillableSessions += billable_sessions;
      subtotal_cents += classTotalCents;

      const breakdown: SessionBillingBreakdown = {
        class_id: classItem.id,
        class_name: classItem.name,
        class_type: 'individual',
        is_advance_billing: false,
        cost_per_session_cents: classItem.cost_per_session_cents,
        present_count,
        late_count,
        unexcused_absent_count,
        excused_count,
        billable_sessions,
        total_cents: classTotalCents,
      };

      classesBreakdown.push(breakdown);

      let description = `${classItem.name} (Individual) — ${billable_sessions} sesiones (${attended} asistidas`;
      if (unexcused_absent_count > 0) {
        description += `, ${unexcused_absent_count} faltas no justificadas facturadas`;
      }
      if (excused_count > 0) {
        description += `, ${excused_count} justificadas exentas`;
      }
      description += `)`;

      invoiceItems.push({
        id: `item-${Date.now()}-${classItem.id.substring(0, 4)}`,
        invoice_id: '',
        class_id: classItem.id,
        class_type: 'individual',
        is_advance_billing: false,
        description,
        quantity: billable_sessions,
        unit_price_cents: classItem.cost_per_session_cents,
        total_cents: classTotalCents,
        present_count,
        late_count,
        unexcused_absent_count,
        excused_count,
      });
    }
  });

  const total_cents = Math.max(0, subtotal_cents - discountCents);

  return {
    classesBreakdown,
    invoiceItems,
    totalBillableSessions,
    totalAttendedSessions,
    totalUnexcusedAbsences,
    totalExcusedAbsences,
    subtotal_cents,
    discount_cents: discountCents,
    total_cents,
  };
}
