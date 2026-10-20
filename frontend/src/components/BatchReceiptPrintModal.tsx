import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Layers, 
  CheckSquare, 
  Square, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import type { EnrichedInvoice } from '../types';
import { EncinaReceiptCard } from './EncinaReceiptCard';

interface BatchReceiptPrintModalProps {
  invoices: EnrichedInvoice[];
  initialIncludeBlanks?: boolean;
  onClose: () => void;
}

export const BatchReceiptPrintModal: React.FC<BatchReceiptPrintModalProps> = ({
  invoices,
  initialIncludeBlanks = true,
  onClose,
}) => {
  const [includeBlanks, setIncludeBlanks] = useState(initialIncludeBlanks);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number | 'all'>('all');

  const totalInvoices = invoices.length;
  const remainder = totalInvoices % 10;
  const blanksNeeded = remainder === 0 ? 0 : 10 - remainder;

  // Prepare full slots array
  type ReceiptSlot = { invoice: EnrichedInvoice; isBlank: false } | { invoice: null; isBlank: true; id: string };

  const allSlots: ReceiptSlot[] = invoices.map((inv) => ({ invoice: inv, isBlank: false }));
  if (includeBlanks && blanksNeeded > 0) {
    for (let i = 0; i < blanksNeeded; i++) {
      allSlots.push({ invoice: null, isBlank: true, id: `blank-${i}` });
    }
  }

  // Chunk into pages of 10 items (2 columns x 5 rows)
  const pageSize = 10;
  const sheets: ReceiptSlot[][] = [];
  for (let i = 0; i < allSlots.length; i += pageSize) {
    sheets.push(allSlots.slice(i, i + pageSize));
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
      {/* Print-specific style tags for strictly 10 per A4 page in 2x5 grid */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #batch-print-root, #batch-print-root * {
            visibility: visible;
          }
          #batch-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          .a4-print-sheet {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(5, 1fr) !important;
            gap: 3mm !important;
            width: 198mm !important;
            height: 284mm !important;
            max-height: 284mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 auto 0 auto !important;
            padding: 0 !important;
          }
          .a4-print-slot {
            width: 100% !important;
            height: 100% !important;
            max-height: 54mm !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar (Hidden in print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Impresión de Recibos en Lote • Formato A4 (10 por página)
              </h2>
              <p className="text-[11px] text-slate-400">
                {totalInvoices} recibo(s) seleccionado(s) • {sheets.length} hoja(s) A4 resultante(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Hojas A4 ({sheets.length})
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Options (Hidden in print) */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-4">
            {/* Blanks Filler Toggle */}
            <button
              onClick={() => setIncludeBlanks(!includeBlanks)}
              className="flex items-center gap-2 font-medium text-slate-700 hover:text-slate-900 cursor-pointer select-none"
            >
              {includeBlanks ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Rellenar última hoja con recibos en blanco ({blanksNeeded} necesarios)</span>
            </button>

            {remainder !== 0 && !includeBlanks && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5" />
                La última hoja solo tendrá {remainder} recibo(s)
              </span>
            )}
          </div>

          {/* Sheet Selector */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveSheetIndex('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeSheetIndex === 'all'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ver todas ({sheets.length})
            </button>
            {sheets.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSheetIndex(idx)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  activeSheetIndex === idx
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hoja {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Printable & Preview Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 print:p-0 print:m-0 print:bg-white flex flex-col items-center">
          
          <div id="batch-print-root" className="w-full flex flex-col items-center space-y-8 print:space-y-0 print:w-auto">
            {sheets.map((sheet, sheetIdx) => {
              if (activeSheetIndex !== 'all' && activeSheetIndex !== sheetIdx) {
                return null;
              }

              return (
                <div 
                  key={sheetIdx} 
                  className="flex flex-col items-center w-full max-w-[850px] print:max-w-none"
                >
                  {/* Sheet Header in preview */}
                  <div className="w-full flex items-center justify-between pb-2 text-xs font-bold text-slate-600 print:hidden">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      Hoja A4 #{sheetIdx + 1} de {sheets.length} (10 recibos)
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Dimensiones: 210 × 297 mm • Rejilla 2 × 5
                    </span>
                  </div>

                  {/* The A4 Page container: 2 cols x 5 rows */}
                  <div 
                    className="a4-print-sheet w-full bg-white shadow-xl rounded-sm p-4 print:p-0 print:shadow-none print:rounded-none border border-slate-300 print:border-none grid grid-cols-2 gap-2 sm:gap-3"
                    style={{
                      minHeight: '280mm',
                      gridTemplateRows: 'repeat(5, minmax(52mm, 1fr))',
                    }}
                  >
                    {sheet.map((slot) => (
                      <div key={slot.isBlank ? slot.id : slot.invoice.id} className="a4-print-slot h-full min-h-[52mm]">
                        <EncinaReceiptCard
                          invoice={slot.isBlank ? null : slot.invoice}
                          isBlank={slot.isBlank}
                          compact={true}
                          showPaidStamp={false}
                        />
                      </div>
                    ))}

                    {/* If sheet has fewer than 10 and blanks filler was disabled, fill empty grid cells to keep 2x5 shape */}
                    {sheet.length < 10 && (
                      Array.from({ length: 10 - sheet.length }).map((_, emptyIdx) => (
                        <div 
                          key={`empty-${emptyIdx}`} 
                          className="border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-300 select-none print:invisible"
                        >
                          Espacio disponible
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Modal Bottom Actions (Hidden in print) */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Total a imprimir: <strong className="text-slate-800">{allSlots.length} recibos</strong> en <strong className="text-indigo-600">{sheets.length} página(s) A4</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ahora
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
