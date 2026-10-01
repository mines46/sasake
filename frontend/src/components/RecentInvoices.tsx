import React, { useState } from 'react';
import { Receipt, ChevronRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { EnrichedInvoice, InvoiceStatus } from '../types';
import { formatCents, formatDate } from '../utils/formatters';

interface RecentInvoicesProps {
  invoices: EnrichedInvoice[];
  onViewInvoice?: (invoice: EnrichedInvoice) => void;
  onViewAll?: () => void;
}

export const RecentInvoices: React.FC<RecentInvoicesProps> = ({
  invoices,
  onViewInvoice,
  onViewAll,
}) => {
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all');

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'all') return true;
    return inv.status === filter;
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header & Filter Tabs */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Invoices</h2>
            <p className="text-xs text-slate-500">Tuition fees & billing statements</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          {(['all', 'pending', 'paid', 'overdue'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-5">Invoice #</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                  No invoices found matching "{filter}".
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => onViewInvoice?.(invoice)}
                >
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900 text-xs sm:text-sm">
                      {invoice.student_name}
                    </div>
                    <div className="text-slate-400 text-xs truncate max-w-[160px]">
                      {invoice.student_email}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900 text-sm">
                    {formatCents(invoice.total_cents)}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewInvoice?.(invoice);
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-0.5"
                    >
                      View
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} invoices
        </span>
        <button
          onClick={onViewAll}
          className="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          View All Invoices
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
