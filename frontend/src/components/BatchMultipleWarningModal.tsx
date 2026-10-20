import React from 'react';
import { AlertTriangle, Printer, Users, X } from 'lucide-react';

interface BatchMultipleWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void; // "Seleccionar más alumnos" -> closes the modal
  onConfirmWithBlanks: () => void; // "Imprimir con recibos en blanco"
}

export const BatchMultipleWarningModal: React.FC<BatchMultipleWarningModalProps> = ({
  isOpen,
  selectedCount,
  onClose,
  onConfirmWithBlanks,
}) => {
  if (!isOpen) return null;

  const remainder = selectedCount % 10;
  const blanksNeeded = remainder === 0 ? 0 : 10 - remainder;
  const totalPages = Math.ceil(selectedCount / 10);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                Aviso: No es múltiplo de 10
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Optimización de formato para 10 recibos por hoja A4 (2×5)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-100/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-600">
          <p className="leading-relaxed text-slate-800">
            Has seleccionado <strong className="text-slate-900 font-bold">{selectedCount} alumnos</strong>. 
            Cada hoja de papel A4 contiene exactamente 10 recibos. Para completar{' '}
            <strong>{totalPages} hoja(s)</strong> entera(s), faltan{' '}
            <strong className="text-amber-700 font-bold">{blanksNeeded} recibo(s)</strong>.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-slate-900">¿Qué deseas hacer?</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>
                <strong>Imprimir con recibos en blanco:</strong> Se generarán los {selectedCount} recibos y los {blanksNeeded} huecos restantes se rellenarán con recibos en blanco totalmente limpios (Alumno, Concepto, Fecha, Nº Recibo e Importe vacíos) para poder rellenarlos a mano.
              </li>
              <li>
                <strong>Seleccionar más alumnos:</strong> Se cerrará este aviso para que puedas seleccionar más o menos alumnos en la lista y volver a lanzar la generación.
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Seleccionar más alumnos</span>
          </button>

          <button
            type="button"
            onClick={onConfirmWithBlanks}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir con recibos en blanco</span>
          </button>
        </div>
      </div>
    </div>
  );
};

