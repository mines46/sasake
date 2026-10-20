import { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Layers
} from 'lucide-react';
import type { EnrichedInvoice } from '../types';
import { formatEuros } from '../utils/formatters';
import { EncinaReceiptCard } from './EncinaReceiptCard';
import { BatchReceiptPrintModal } from './BatchReceiptPrintModal';

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
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaid = invoice.status === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Print CSS ensuring the single bill prints at the EXACT SAME SIZE as the batch slips (97.5 x 54.4 mm) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #single-receipt-print-root, #single-receipt-print-root * {
            visibility: visible !important;
          }
          #single-receipt-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 97.5mm !important;
            height: 54.4mm !important;
            max-width: 97.5mm !important;
            max-height: 54.4mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-sizing: border-box !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>

      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Recibo Oficial de Pago • Academia Encina</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchPrintModal(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir en hoja A4 entera con 9 huecos en blanco para aprovechar el papel"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hoja A4 (10 por hoja)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Imprime este recibo individual en el tamaño exacto de lote (97,5 × 54,4 mm)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Recibo (97 × 54 mm)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-100 print:bg-white print:p-0 print:m-0 flex flex-col items-center justify-center">
          
          {/* Format indicator badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs print:hidden">
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tamaño de impresión: <strong>97,5 × 54,4 mm</strong> (Idéntico al tamaño de recibos en lotes)</span>
          </div>

          {/* THE EXACT OFFICIAL RECIBO CARD AT BATCH SIZE */}
          <div 
            id="single-receipt-print-root" 
            className="w-[97.5mm] h-[54.4mm] bg-white shadow-md print:shadow-none border border-slate-300 print:border-none box-border flex-shrink-0"
          >
            <EncinaReceiptCard invoice={invoice} compact={true} showPaidStamp={isPaid} />
          </div>

          {/* Audit Breakdown Drawer Toggle (Hidden in print) */}
          <div className="w-full max-w-lg print:hidden">
            <button
              onClick={() => setShowDetailedAudit((prev) => !prev)}
              className="w-full py-2 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-colors shadow-2xs"
            >
              <span>Auditoría de Asistencia y Cálculo de Facturación</span>
              {showDetailedAudit ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showDetailedAudit && (
              <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl space-y-3 text-xs text-slate-700 shadow-xs">
                <div className="flex justify-between pb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-500">Subtotal de sesiones:</span>
                  <span className="font-bold font-mono">{formatEuros(invoice.subtotal_cents)}</span>
                </div>
                {invoice.discount_cents > 0 && (
                  <div className="flex justify-between pb-2 border-b border-slate-100 text-emerald-700">
                    <span className="font-semibold">Beca / Descuento:</span>
                    <span className="font-bold font-mono">-{formatEuros(invoice.discount_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
                  <span>Total Final:</span>
                  <span className="font-mono text-indigo-600">{formatEuros(invoice.total_cents)}</span>
                </div>

                {invoice.items && invoice.items.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      Detalle de asistencia por materia:
                    </span>
                    {invoice.items.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                        <div className="font-bold text-slate-900">{item.description}</div>
                        <div className="text-[11px] text-slate-600 flex justify-between">
                          <span>{item.quantity} sesiones x {formatEuros(item.unit_price_cents)}</span>
                          <span className="font-bold font-mono text-slate-900">{formatEuros(item.total_cents)}</span>
                        </div>
                        {item.unexcused_absent_count !== undefined && item.unexcused_absent_count > 0 && (
                          <div className="text-[10px] text-amber-800 font-medium">
                            • Incluye {item.unexcused_absent_count} falta(s) sin justificar (facturada como asistida).
                          </div>
                        )}
                        {item.excused_count !== undefined && item.excused_count > 0 && (
                          <div className="text-[10px] text-sky-800 font-medium">
                            • {item.excused_count} falta(s) justificada(s) exentas de cobro.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden when printing) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Estado actual:{' '}
            <strong className={isPaid ? 'text-emerald-700' : 'text-amber-700'}>
              {isPaid ? 'Pagado' : 'Pendiente'}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            {!isPaid && onMarkPaid && (
              <button
                onClick={() => {
                  onMarkPaid(invoice.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Registrar Pago
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Batch Sheet Print Preview (10 per A4 page with this bill + 9 blank slips) */}
      {showBatchPrintModal && (
        <BatchReceiptPrintModal
          invoices={[invoice]}
          initialIncludeBlanks={true}
          onClose={() => setShowBatchPrintModal(false)}
        />
      )}
    </div>
  );
};
