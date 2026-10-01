// Core entities matching database/schema.sql and backend JSON contracts

export type StudentStatus = 'active' | 'inactive' | 'suspended';
export type BillingPeriod = 'hourly' | 'monthly' | 'course';
export type EnrollmentStatus = 'active' | 'dropped' | 'completed';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  guardian_name?: string;
  guardian_phone?: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface ClassItem {
  id: string;
  name: string;
  description?: string;
  instructor_name?: string;
  capacity: number;
  cost_per_session_cents: number; // Cost per class session in minor units (cents)
  price_cents: number; // Legacy or fixed package tuition in cents
  billing_period: BillingPeriod;
  is_active: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
}

export interface ClassSchedule {
  id: string;
  class_id: string;
  day_of_week: number; // 1 = Monday, 7 = Sunday
  start_time: string; // e.g. "09:00:00"
  end_time: string; // e.g. "10:30:00"
  room?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  recorded_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number; // Billable sessions count
  unit_price_cents: number; // Cost per session in cents
  total_cents: number;
  class_id?: string;
  // Attendance session breakdown detail for official receipts ("Recibos")
  present_count?: number;
  late_count?: number;
  unexcused_absent_count?: number; // Counted as assisted per academy policy
  excused_count?: number; // Waived
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  status: InvoiceStatus;
  paid_at?: string;
  notes?: string;
  created_at: string;
  items?: InvoiceItem[];
}

// Session-based Attendance Billing calculation breakdown
export interface SessionBillingBreakdown {
  class_id: string;
  class_name: string;
  cost_per_session_cents: number;
  present_count: number;
  late_count: number;
  unexcused_absent_count: number; // No excuse -> billed as assisted!
  excused_count: number; // Excused -> not billed
  billable_sessions: number; // (present + late + unexcused_absent)
  total_cents: number; // billable_sessions * cost_per_session_cents
}

// Composite / View models for Dashboard & Billing
export interface EnrichedScheduleItem extends ClassSchedule {
  class_name: string;
  instructor_name: string;
  enrolled_students: number;
  capacity: number;
}

export interface EnrichedInvoice extends Invoice {
  student_name: string;
  student_email: string;
  guardian_name?: string;
  guardian_phone?: string;
}

export interface DashboardMetrics {
  total_students: number;
  active_students: number;
  total_classes: number;
  attendance_rate_today: number; // percentage (e.g. 94.2)
  today_attendance_counts: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  monthly_revenue_cents: number;
  pending_invoices_cents: number;
  overdue_invoices_count: number;
}
