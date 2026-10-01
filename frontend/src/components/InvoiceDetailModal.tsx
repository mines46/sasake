import { X, CheckCircle2, Mail, Printer } from 'lucide-react';
import type { EnrichedInvoice } from '../types';
import { formatCents, formatDate } from '../utils/formatters';

interface InvoiceDetailModalProps {
  invoice: EnrichedInvoice | null;
  onClose: () => void;
  onMarkPaid?: (id: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  onMarkPaid,
}) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 font-mono">
                {invoice.invoice_number}
              </h3>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : invoice.status === 'overdue'
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Invoice Statement Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Student Info Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Billed To
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{invoice.student_name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {invoice.student_email}
                </p>
              </div>
            </div>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-slate-400">Issue Date</span>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDate(invoice.issue_date)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
              <span className="text-slate-400">Due Date</span>
              <p className="font-semibold text-slate-800 mt-0.5">{formatDate(invoice.due_date)}</p>
            </div>
          </div>

          {/* Breakdown / Line Items */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50/80 text-xs font-semibold text-slate-600 border-b border-slate-100 flex justify-between">
              <span>Item / Description</span>
              <span>Amount</span>
            </div>
            <div className="p-3.5 flex justify-between items-center text-sm border-b border-slate-100">
              <div>
                <span className="font-medium text-slate-800">
                  {invoice.notes || 'Academy Course Tuition Fee'}
                </span>
                <p className="text-xs text-slate-400">Standard monthly enrollment billing</p>
              </div>
              <span className="font-semibold text-slate-900">
                {formatCents(invoice.subtotal_cents)}
              </span>
            </div>
            {invoice.discount_cents > 0 && (
              <div className="p-3 flex justify-between items-center text-xs text-emerald-600 bg-emerald-50/30 border-b border-slate-100">
                <span>Discount / Scholarship</span>
                <span>-{formatCents(invoice.discount_cents)}</span>
              </div>
            )}
            <div className="p-3.5 bg-slate-50/40 flex justify-between items-center font-bold text-base text-slate-900">
              <span>Total Due</span>
              <span className="text-indigo-600">{formatCents(invoice.total_cents)}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => alert(`Printing invoice #${invoice.invoice_number}`)}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>

          <div className="flex gap-2">
            {invoice.status !== 'paid' && onMarkPaid && (
              <button
                onClick={() => {
                  onMarkPaid(invoice.id);
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Paid
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
