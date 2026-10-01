import { useState, useMemo } from 'react';
import { 
  Receipt, 
  Calculator, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Info,
  Sparkles
} from 'lucide-react';
import type { EnrichedInvoice, ClassItem } from '../types';
import { formatCents, formatDate } from '../utils/formatters';
import { AttendanceInvoiceGeneratorModal } from '../components/AttendanceInvoiceGeneratorModal';
import { OfficialReceiptModal } from '../components/OfficialReceiptModal';

interface BillingPageProps {
  invoices: EnrichedInvoice[];
  onAddInvoice: (invoice: EnrichedInvoice) => void;
  onMarkInvoicePaid: (id: string) => void;
  classes?: ClassItem[];
}

export const BillingPage: React.FC<BillingPageProps> = ({
  invoices,
  onAddInvoice,
  onMarkInvoicePaid,
  classes,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<EnrichedInvoice | null>(null);

  // Financial KPI totals
  const { totalInvoiced, totalCollected, totalPending, totalOverdue, totalUnexcusedCharged } = useMemo(() => {
    let invoiced = 0;
    let collected = 0;
    let pending = 0;
    let overdue = 0;
    let unexcusedCount = 0;

    invoices.forEach((inv) => {
      invoiced += inv.total_cents;
      if (inv.status === 'paid') {
        collected += inv.total_cents;
      } else if (inv.status === 'overdue') {
        overdue += inv.total_cents;
        pending += inv.total_cents;
      } else if (inv.status === 'pending') {
        pending += inv.total_cents;
      }

      inv.items?.forEach((item) => {
        if (item.unexcused_absent_count) {
          unexcusedCount += item.unexcused_absent_count;
        }
      });
    });

    return {
      totalInvoiced: invoiced,
      totalCollected: collected,
      totalPending: pending,
      totalOverdue: overdue,
      totalUnexcusedCharged: unexcusedCount,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.student_name.toLowerCase().includes(q) ||
        inv.student_email.toLowerCase().includes(q) ||
        (inv.guardian_name && inv.guardian_name.toLowerCase().includes(q))
      );
    });
  }, [invoices, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Priority Billing: Tuition Invoices & Recibos
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Core Priority Module
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Official academy receipts calculated automatically from student attendance records and course session rates.
          </p>
        </div>

        <button
          onClick={() => setIsGeneratorOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all self-start md:self-auto shrink-0"
        >
          <Calculator className="w-4 h-4" />
          <span>Generate Attendance Recibo</span>
        </button>
      </div>

      {/* Attendance Billing Rule Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/70 border border-indigo-100 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <strong>Reglamento de Facturación por Sesión / Session Billing Protocol:</strong>
          <span className="block mt-0.5 text-slate-700">
            Cada curso cuenta con un costo por sesión establecido. El recibo se calcula multiplicando las sesiones asistidas por dicho costo. 
            <strong> Si un estudiante no asiste a una clase sin justificación médica, dicha sesión cuenta como asistida y es facturada en el recibo.</strong> Las ausencias con justificante quedan exoneradas.
          </span>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Invoiced
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 font-mono">
            {formatCents(totalInvoiced)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {invoices.length} official receipts issued
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Collected (Paid)
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 font-mono">
            {formatCents(totalCollected)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Tuition revenue received
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending / Overdue
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700 font-mono">
            {formatCents(totalPending)}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-medium">
            {formatCents(totalOverdue)} past due date
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unexcused Sessions Billed
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-purple-700 font-mono">
            {totalUnexcusedCharged} Sessions
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Accounted per academy rules
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {(['all', 'pending', 'paid', 'overdue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  filterStatus === tab
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
              placeholder="Search by Recibo #, student..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Recibo #</th>
                <th className="py-3 px-4">Student & Guardian</th>
                <th className="py-3 px-4">Sessions Detail</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total Due</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                    No recibos found matching "{searchQuery || filterStatus}".
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const billableSessionsCount = inv.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                  const unexcusedCount = inv.items?.reduce((acc, it) => acc + (it.unexcused_absent_count || 0), 0) || 0;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setViewingReceipt(inv)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {inv.student_name}
                        </div>
                        <div className="text-slate-400 text-xs truncate max-w-[180px]">
                          {inv.guardian_name ? `Guardian: ${inv.guardian_name}` : inv.student_email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-800">
                          {billableSessionsCount} billable sessions
                        </div>
                        {unexcusedCount > 0 && (
                          <div className="text-[11px] text-amber-700 font-medium">
                            Includes {unexcusedCount} unexcused absence
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {formatDate(inv.due_date)}
                      </td>

                      <td className="py-3.5 px-4">
                        {inv.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </span>
                        ) : inv.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm sm:text-base">
                        {formatCents(inv.total_cents)}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingReceipt(inv);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Recibo
                          </button>

                          {inv.status !== 'paid' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkInvoicePaid(inv.id);
                              }}
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-200 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} recibos
          </span>
          <span>
            Official receipts format compliant with Academy Policy
          </span>
        </div>
      </div>

      {/* Generator Modal */}
      <AttendanceInvoiceGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onInvoiceCreated={onAddInvoice}
        classes={classes}
      />

      {/* Official Receipt Viewer & Print Modal */}
      <OfficialReceiptModal
        invoice={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        onMarkPaid={onMarkInvoicePaid}
      />
    </div>
  );
};
