import type { 
  Attendance, 
  ClassItem, 
  Enrollment, 
  InvoiceItem, 
  SessionBillingBreakdown 
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
 * Calculates a student's invoice ("recibo") based on session attendance:
 * - Sessions assisted (present, late) are billable.
 * - Unexcused absences (absent) COUNT AS ASSISTED and are billable.
 * - Excused absences (excused) are exempted / not billed.
 */
export function calculateStudentAttendanceBilling(params: {
  studentId: string;
  startDate: string;
  endDate: string;
  enrollments: Enrollment[];
  classes: ClassItem[];
  attendanceRecords: Attendance[];
  discountCents?: number;
}): BillingCalculationResult {
  const {
    studentId,
    startDate,
    endDate,
    enrollments,
    classes,
    attendanceRecords,
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

    // Filter attendance in the billing cycle for this student and class
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
          // Critical rule: unexcused absence counts as assisted!
          unexcused_absent_count++;
          break;
        case 'excused':
          excused_count++;
          break;
      }
    });

    const attended = present_count + late_count;
    // Billable sessions = attended + unexcused absence
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
      cost_per_session_cents: classItem.cost_per_session_cents,
      present_count,
      late_count,
      unexcused_absent_count,
      excused_count,
      billable_sessions,
      total_cents: classTotalCents,
    };

    classesBreakdown.push(breakdown);

    // Build invoice line item with clear transparent narrative
    let description = `${classItem.name} — ${billable_sessions} sessions (${attended} attended`;
    if (unexcused_absent_count > 0) {
      description += `, ${unexcused_absent_count} unexcused absences billed`;
    }
    if (excused_count > 0) {
      description += `, ${excused_count} excused waived`;
    }
    description += `)`;

    invoiceItems.push({
      id: `item-${Date.now()}-${classItem.id.substring(0, 4)}`,
      invoice_id: '',
      class_id: classItem.id,
      description,
      quantity: billable_sessions,
      unit_price_cents: classItem.cost_per_session_cents,
      total_cents: classTotalCents,
      present_count,
      late_count,
      unexcused_absent_count,
      excused_count,
    });
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
