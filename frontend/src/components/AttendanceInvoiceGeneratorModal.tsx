import { useState, useMemo } from 'react';
import { 
  X, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Sparkles,
  Info
} from 'lucide-react';
import { mockStudents, mockClasses, mockEnrollments, mockAttendanceHistory } from '../data/mockData';
import type { EnrichedInvoice, ClassItem } from '../types';
import { calculateStudentAttendanceBilling } from '../utils/billingCalculator';
import { formatCents } from '../utils/formatters';

interface AttendanceInvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: EnrichedInvoice) => void;
  classes?: ClassItem[];
}

export const AttendanceInvoiceGeneratorModal: React.FC<AttendanceInvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  classes = mockClasses,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState(mockStudents[0]?.id || '');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [discountDollars, setDiscountDollars] = useState('0');
  const [dueDate, setDueDate] = useState('2026-10-10');
  const [notes, setNotes] = useState('September 2026 Attendance-based Tuition Recibo');

  // Find student info
  const selectedStudent = useMemo(
    () => mockStudents.find((s) => s.id === selectedStudentId),
    [selectedStudentId]
  );

  // Compute live billing calculation using our engine
  const calculation = useMemo(() => {
    const discountCents = Math.round(parseFloat(discountDollars || '0') * 100);
    return calculateStudentAttendanceBilling({
      studentId: selectedStudentId,
      startDate,
      endDate,
      enrollments: mockEnrollments,
      classes,
      attendanceRecords: mockAttendanceHistory,
      discountCents,
    });
  }, [selectedStudentId, startDate, endDate, discountDollars, classes]);

  if (!isOpen) return null;

  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const invoiceNum = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice: EnrichedInvoice = {
      id: `inv-${Date.now()}`,
      invoice_number: invoiceNum,
      student_id: selectedStudent.id,
      student_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
      student_email: selectedStudent.email,
      guardian_name: selectedStudent.guardian_name,
      guardian_phone: selectedStudent.guardian_phone,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      subtotal_cents: calculation.subtotal_cents,
      discount_cents: calculation.discount_cents,
      total_cents: calculation.total_cents,
      status: 'pending',
      notes,
      created_at: new Date().toISOString(),
      items: calculation.invoiceItems,
    };

    onInvoiceCreated(newInvoice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Generate Attendance Recibo (Invoice)</h3>
              <p className="text-xs text-slate-300">Calculates billable sessions: attended + unexcused absences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleGenerateInvoice} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Policy Banner Notice */}
          <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-100/80 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 leading-relaxed">
              <strong>Attendance Billing Policy:</strong> Tuition is calculated per session attended. If a student misses a class without an excuse, <strong>it is counted as assisted and billed</strong>. Excused medical or justified absences are waived.
            </div>
          </div>

          {/* Student & Date Range Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Profile
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                {mockStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Billing Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Billing End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Real-time Calculation Breakdown per Enrolled Class */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Session Calculation Breakdown
              </span>
              <span className="text-xs text-slate-500">
                {calculation.classesBreakdown.length} Enrolled Courses Found
              </span>
            </div>

            {calculation.classesBreakdown.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                No active class enrollments or attendance records found for this student in the selected date range.
              </div>
            ) : (
              <div className="space-y-2.5">
                {calculation.classesBreakdown.map((item) => (
                  <div
                    key={item.class_id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-200 transition-colors shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.class_name}</h4>
                        <p className="text-xs text-slate-500">
                          Rate: <strong>{formatCents(item.cost_per_session_cents)}</strong> per session
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-indigo-600">
                          {formatCents(item.total_cents)}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          {item.billable_sessions} billable sessions
                        </div>
                      </div>
                    </div>

                    {/* Attendance Pills & Breakdown */}
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" />
                        {item.present_count + item.late_count} Attended
                      </span>

                      {item.unexcused_absent_count > 0 && (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200"
                          title="Policy: Unexcused absences are counted as assisted and charged"
                        >
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          {item.unexcused_absent_count} Unexcused (Billed)
                        </span>
                      )}

                      {item.excused_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium border border-sky-100">
                          {item.excused_count} Excused (Waived)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Adjustments Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Total Billable Sessions ({calculation.totalAttendedSessions} attended + {calculation.totalUnexcusedAbsences} unexcused):</span>
              <strong className="text-slate-800">{calculation.totalBillableSessions} sessions</strong>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Subtotal:</span>
              <strong className="text-slate-900 font-semibold">{formatCents(calculation.subtotal_cents)}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Discount / Scholarship (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountDollars}
                    onChange={(e) => setDiscountDollars(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-slate-500">
                  Total Recibo Amount
                </span>
                <p className="text-[11px] text-slate-400">Calculated strictly in integer cents</p>
              </div>
              <div className="text-xl font-bold text-indigo-600">
                {formatCents(calculation.total_cents)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Recibo Memo / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. September 2026 Tuition Statement"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={calculation.invoiceItems.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-indigo-600/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Issue Official Recibo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
