import React from 'react';
import type { EnrichedInvoice } from '../types';
import { formatEuros, formatDateSpanish, formatReceiptNumber } from '../utils/formatters';

interface EncinaReceiptCardProps {
  invoice?: EnrichedInvoice | null;
  isBlank?: boolean;
  compact?: boolean;
  showPaidStamp?: boolean;
}

export const EncinaTreeLogo: React.FC<{ className?: string; textClassName?: string }> = ({ 
  className = 'w-16 h-16',
  textClassName = 'text-xs tracking-[0.3em]'
}) => (
  <div className="flex flex-col items-center justify-center select-none">
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="currentColor">
      {/* Root System spreading outward */}
      <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
        <path d="M60 88 C56 94 48 100 34 104" />
        <path d="M58 90 C52 97 42 103 26 107" />
        <path d="M60 88 C64 94 72 100 86 104" />
        <path d="M62 90 C68 97 78 103 94 107" />
        <path d="M60 86 L60 108" />
        <path d="M55 92 C47 98 39 101 30 102" />
        <path d="M65 92 C73 98 81 101 90 102" />
      </g>

      {/* Gnarled Oak Trunk */}
      <path
        d="M52 88 C54 74 51 62 46 54 C53 57 57 58 60 58 C63 58 67 57 74 54 C69 62 66 74 68 88 C63 87 57 87 52 88 Z"
        fill="#1e293b"
      />

      {/* Structural Branches */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round">
        <path d="M55 58 C46 48 35 44 24 46" />
        <path d="M65 58 C74 48 85 44 96 46" />
        <path d="M59 54 L59 34" />
        <path d="M57 48 C49 42 38 34 32 28" />
        <path d="M63 48 C71 42 82 34 88 28" />
        <path d="M50 44 C42 36 34 34 26 34" />
        <path d="M70 44 C78 36 86 34 94 34" />
      </g>

      {/* Intricate Canopy Foliage Texture */}
      <g fill="#334155" opacity="0.85">
        <circle cx="60" cy="20" r="13" />
        <circle cx="44" cy="26" r="12" />
        <circle cx="76" cy="26" r="12" />
        <circle cx="30" cy="36" r="11" />
        <circle cx="90" cy="36" r="11" />
        <circle cx="22" cy="48" r="9.5" />
        <circle cx="98" cy="48" r="9.5" />
        <circle cx="38" cy="44" r="11" />
        <circle cx="82" cy="44" r="11" />
        <circle cx="60" cy="36" r="14" />
        <circle cx="50" cy="46" r="9.5" />
        <circle cx="70" cy="46" r="9.5" />
      </g>

      {/* Foliage Highlights & Leaf Scallops */}
      <g fill="#f8fafc" opacity="0.35">
        <circle cx="56" cy="18" r="3.5" />
        <circle cx="42" cy="24" r="3" />
        <circle cx="74" cy="24" r="3" />
        <circle cx="28" cy="34" r="2.5" />
        <circle cx="88" cy="34" r="2.5" />
        <circle cx="58" cy="32" r="4" />
      </g>
    </svg>
    <span className={`font-serif font-bold uppercase mt-0.5 text-slate-900 ${textClassName}`}>
      ENCINA
    </span>
  </div>
);

export const EncinaReceiptCard: React.FC<EncinaReceiptCardProps> = ({
  invoice,
  isBlank = false,
  compact = false,
  showPaidStamp = true,
}) => {
  const empty = isBlank || !invoice;
  const isPaid = !empty && invoice?.status === 'paid' && showPaidStamp;

  // Compute concept details
  let conceptClass = 'CLASE';
  let conceptGroup = 'GRUPO';

  if (!empty && invoice) {
    if (invoice.items && invoice.items.length > 0) {
      if (invoice.items.length === 1) {
        const item = invoice.items[0];
        const parts = item.description.split('—');
        conceptClass = parts[0].trim().toUpperCase();

        const attended = (item.present_count || 0) + (item.late_count || 0);
        const unexcused = item.unexcused_absent_count || 0;

        if (parts[1]) {
          conceptGroup = parts[1].trim().toUpperCase();
        } else {
          conceptGroup = `${item.quantity} SESIONES (${attended} ASISTIDAS${unexcused > 0 ? ` + ${unexcused} INASISTENCIA` : ''})`;
        }
      } else {
        conceptClass = invoice.items.map((it) => it.description.split('—')[0].trim()).join(' / ').toUpperCase();
        const totalSessions = invoice.items.reduce((acc, it) => acc + it.quantity, 0);
        conceptGroup = `TOTAL: ${totalSessions} SESIONES FACTURABLES`;
      }
    } else if (invoice.notes) {
      conceptClass = invoice.notes.toUpperCase();
      conceptGroup = 'MENSUALIDAD';
    }
  }

  if (compact) {
    return (
      <div className="w-full h-full bg-white border-[1.5px] border-black text-black box-border flex flex-col justify-between overflow-hidden relative leading-tight select-none">
        {/* Optional Paid Stamp Badge */}
        {isPaid && (
          <div className="absolute right-3 bottom-8 pointer-events-none transform -rotate-12 select-none border-2 border-emerald-600/80 px-2 py-0.5 rounded text-emerald-700/80 font-black text-xs tracking-widest uppercase">
            PAGADO
          </div>
        )}

        {/* Top Section: Logo & Date/Receipt Number */}
        <div className="grid grid-cols-12 border-b-[1.5px] border-black flex-shrink-0" style={{ height: '22mm' }}>
          {/* Logo */}
          <div className="col-span-5 border-r-[1.5px] border-black flex items-center justify-center p-1 bg-white">
            <EncinaTreeLogo className="w-10 h-10" textClassName="text-[8px] tracking-[0.25em]" />
          </div>

          {/* Fecha & Nº Recibo */}
          <div className="col-span-7 flex flex-col divide-y-[1.5px] divide-black">
            <div className="flex-1 flex flex-col items-center justify-center px-1">
              <span className="text-[8px] font-semibold text-black leading-none">Fecha:</span>
              <span className="text-[9.5px] font-bold font-mono text-black leading-none mt-0.5 min-h-[12px] flex items-center justify-center">
                {empty ? '' : formatDateSpanish(invoice?.issue_date || invoice?.created_at || '')}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-1">
              <span className="text-[8px] font-semibold text-black leading-none">Nº Recibo:</span>
              <span className="text-[9.5px] font-bold font-mono text-black leading-none mt-0.5 min-h-[12px] flex items-center justify-center">
                {empty ? '' : formatReceiptNumber(invoice?.invoice_number || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Rows */}
        <div className="flex-1 flex flex-col justify-evenly divide-y-[1.5px] divide-black">
          {/* Alumno */}
          <div className="grid grid-cols-12 text-[8.5px] py-1 min-h-[18px]">
            <div className="col-span-3 border-r-[1.5px] border-black px-1.5 font-bold text-black flex items-center">
              Alumno:
            </div>
            <div className="col-span-9 px-2 font-bold uppercase tracking-wider text-black truncate flex items-center">
              {empty ? '' : invoice?.student_name}
            </div>
          </div>

          {/* Concepto */}
          <div className="grid grid-cols-12 text-[8.5px] py-1 min-h-[22px]">
            <div className="col-span-3 border-r-[1.5px] border-black px-1.5 font-bold text-black flex items-center">
              Concepto:
            </div>
            <div className="col-span-9 px-2 flex flex-col justify-center text-center overflow-hidden">
              {!empty && (
                <>
                  <div className="font-bold uppercase tracking-wide text-black truncate text-[8.5px] leading-tight">
                    {conceptClass}
                  </div>
                  <div className="text-[7.5px] font-semibold uppercase text-black truncate leading-tight mt-0.5">
                    {conceptGroup}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Importe */}
          <div className="grid grid-cols-12 text-[8.5px] py-1 min-h-[18px]">
            <div className="col-span-3 border-r-[1.5px] border-black px-1.5 font-bold text-black flex items-center">
              Importe:
            </div>
            <div className="col-span-9 px-2 font-bold text-[10px] text-black font-mono flex items-center justify-center">
              {empty ? '' : formatEuros(invoice?.total_cents || 0)}
            </div>
          </div>
        </div>

        {/* Bottom Legal Notice */}
        <div className="py-1 px-1.5 text-center text-[7px] text-black font-normal border-t-[1.5px] border-black bg-white flex-shrink-0 leading-tight">
          Plazo de pago, <strong>5 días naturales</strong> desde su entrega
        </div>
      </div>
    );
  }

  // Full / Modal Standard View
  return (
    <div className="w-full max-w-lg bg-white border-2 border-black text-black shadow-md print:shadow-none print:border-2 print:border-black print:max-w-none print:w-full relative">
      {/* Optional Paid Stamp Badge */}
      {isPaid && (
        <div className="absolute right-6 bottom-16 pointer-events-none transform -rotate-12 select-none border-4 border-emerald-600/80 px-4 py-1 rounded-lg text-emerald-700/80 font-black text-xl tracking-widest uppercase shadow-xs">
          PAGADO
        </div>
      )}

      {/* Top Grid: Logo on Left, Fecha & Nº Recibo on Right */}
      <div className="grid grid-cols-12 border-b-2 border-black">
        {/* Logo Column */}
        <div className="col-span-6 border-r-2 border-black p-4 flex items-center justify-center bg-white">
          <EncinaTreeLogo className="w-24 h-24" textClassName="text-sm tracking-[0.35em]" />
        </div>

        {/* Date & Receipt Number Column */}
        <div className="col-span-6 flex flex-col divide-y-2 divide-black">
          {/* Fecha */}
          <div className="py-2.5 px-3 flex flex-col items-center justify-center">
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-black">
              Fecha:
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-black mt-0.5 min-h-[1.5em] flex items-center justify-center">
              {empty ? '' : formatDateSpanish(invoice?.issue_date || invoice?.created_at || '')}
            </span>
          </div>

          {/* Nº Recibo */}
          <div className="py-2.5 px-3 flex flex-col items-center justify-center">
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-black">
              Nº Recibo:
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-black mt-0.5 min-h-[1.5em] flex items-center justify-center">
              {empty ? '' : formatReceiptNumber(invoice?.invoice_number || '')}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Alumno */}
      <div className="grid grid-cols-12 border-b-2 border-black text-xs sm:text-sm min-h-[3rem]">
        <div className="col-span-3 border-r-2 border-black px-3 py-2.5 font-bold text-black flex items-center">
          Alumno:
        </div>
        <div className="col-span-9 px-4 py-2.5 font-bold uppercase tracking-wider text-black flex items-center">
          {empty ? '' : invoice?.student_name}
        </div>
      </div>

      {/* Middle Row: Concepto */}
      <div className="grid grid-cols-12 border-b-2 border-black text-xs sm:text-sm min-h-[3.5rem]">
        <div className="col-span-3 border-r-2 border-black px-3 py-3 font-bold text-black flex items-center">
          Concepto:
        </div>
        <div className="col-span-9 px-4 py-3 flex flex-col justify-center text-center">
          {!empty && (
            <>
              <div className="font-bold uppercase tracking-wide text-black text-sm sm:text-base">
                {conceptClass}
              </div>
              <div className="text-xs font-semibold uppercase text-black mt-0.5">
                {conceptGroup}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle Row: Importe */}
      <div className="grid grid-cols-12 border-b-2 border-black text-xs sm:text-sm min-h-[3rem]">
        <div className="col-span-3 border-r-2 border-black px-3 py-2.5 font-bold text-black flex items-center">
          Importe:
        </div>
        <div className="col-span-9 px-4 py-2.5 font-bold text-base sm:text-lg text-black font-mono flex items-center justify-center">
          {empty ? '' : formatEuros(invoice?.total_cents || 0)}
        </div>
      </div>

      {/* Bottom Row: Official Payment Policy Footer */}
      <div className="py-2.5 px-3 text-center text-[11px] sm:text-xs text-black font-normal bg-white">
        Plazo de pago, <strong>5 días naturales</strong> desde su entrega
      </div>
    </div>
  );
};

