import { 
  X, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  GraduationCap, 
  ShieldCheck, 
  User, 
  Mail 
} from 'lucide-react';
import type { EnrichedInvoice } from '../types';
import { formatCents, formatDate } from '../utils/formatters';

interface OfficialReceiptModalProps {
  invoice: EnrichedInvoice | null;
  onClose: () => void;
  onMarkPaid?: (id: string) => void;
}

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({
  invoice,
  onClose,
  onMarkPaid,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>SasaKe Academy — Official Receipt Viewer</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white text-slate-900 print:p-0">
          {/* Header & Watermark/Status Stamp */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    SASAKE ACADEMY
                  </h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                    Academy Management & Student Billing
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                124 Academic Way, Education District • support@sasake-academy.com
              </p>
            </div>

            {/* Official Stamp & Invoice Code */}
            <div className="text-left sm:text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                RECIBO OFICIAL / RECEIPT
              </div>
              <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
                {invoice.invoice_number}
              </div>

              {/* Status Stamp Badge */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border">
                {isPaid ? (
                  <span className="text-emerald-700 bg-emerald-50 border-emerald-200 border px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PAGADO / PAID
                  </span>
                ) : isOverdue ? (
                  <span className="text-rose-700 bg-rose-50 border-rose-200 border px-3 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    VENCIDO / OVERDUE
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 border-amber-200 border px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    PENDIENTE / PENDING
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Student & Date Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Student & Guardian Information
              </span>
              <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {invoice.student_name}
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {invoice.student_email}
              </p>
              {invoice.guardian_name && (
                <p className="text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Guardian: <strong>{invoice.guardian_name}</strong>
                  {invoice.guardian_phone && ` (${invoice.guardian_phone})`}
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Dates & Statement Details
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Issue Date:</span>
                <strong className="text-slate-800">{formatDate(invoice.issue_date)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Due:</span>
                <strong className="text-slate-800">{formatDate(invoice.due_date)}</strong>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between pt-1 border-t border-slate-200/60 text-emerald-700">
                  <span>Paid On:</span>
                  <strong>{formatDate(invoice.paid_at)}</strong>
                </div>
              )}
              {invoice.notes && (
                <p className="text-slate-500 italic pt-1 border-t border-slate-200/60">
                  {invoice.notes}
                </p>
              )}
            </div>
          </div>

          {/* Session Attendance Calculation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Class / Session Details</th>
                  <th className="py-2.5 px-3 text-center">Cost / Session</th>
                  <th className="py-2.5 px-3 text-center">Billable Sessions</th>
                  <th className="py-2.5 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!invoice.items || invoice.items.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-4 px-4 text-center text-slate-400">
                      Standard tuition charge: {formatCents(invoice.total_cents)}
                    </td>
                  </tr>
                ) : (
                  invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.description}</div>
                        {(item.unexcused_absent_count !== undefined && item.unexcused_absent_count > 0) && (
                          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                            • Includes {item.unexcused_absent_count} unexcused absence(s) billed per academy policy
                          </div>
                        )}
                        {(item.excused_count !== undefined && item.excused_count > 0) && (
                          <div className="text-[11px] text-sky-700 font-medium mt-0.5">
                            • {item.excused_count} justified absence(s) exempted from billing
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {formatCents(item.unit_price_cents)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        {item.quantity} sessions
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCents(item.total_cents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="bg-slate-50/70 p-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal (Base Tuition & Sessions):</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCents(invoice.subtotal_cents)}
                </span>
              </div>
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Scholarship / Discount Applied:</span>
                  <span className="font-mono font-semibold">
                    -{formatCents(invoice.discount_cents)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span className="uppercase tracking-wider">Total Due / Importe Total:</span>
                <span className="text-base text-indigo-600 font-mono">
                  {formatCents(invoice.total_cents)}
                </span>
              </div>
            </div>
          </div>

          {/* Academy Attendance Policy Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block uppercase tracking-wider text-[10px]">
              Reglamento de Facturación y Asistencia / Attendance Billing Terms:
            </span>
            <p>
              El costo de las clases se calcula con base en el valor por sesión establecido al crear la materia y las sesiones asistidas. Si un alumno no asiste a clase sin justificación médica o debida autorización previa, dicha inasistencia se contabiliza como asistida y es facturable en su totalidad.
            </p>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-400">
            ID: <code className="font-mono">{invoice.id}</code>
          </span>

          <div className="flex items-center gap-2">
            {!isPaid && onMarkPaid && (
              <button
                onClick={() => {
                  onMarkPaid(invoice.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Registrar Pago (Mark Paid)
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
