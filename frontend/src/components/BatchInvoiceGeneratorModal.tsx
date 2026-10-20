import React, { useState, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Users, 
  Search, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Calendar, 
  Loader2, 
  Sparkles,
  FileText
} from 'lucide-react';
import type { Student, EnrichedInvoice } from '../types';
import { invoiceApi } from '../api/invoices';
import { BatchMultipleWarningModal } from './BatchMultipleWarningModal';

interface BatchInvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: Student[];
  initialSelectedStudentIds?: string[];
  onCloseToSelectStudents?: () => void;
  onBatchGenerated: (invoices: EnrichedInvoice[], includeBlanks: boolean) => void;
}

export const BatchInvoiceGeneratorModal: React.FC<BatchInvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  students = [],
  initialSelectedStudentIds,
  onCloseToSelectStudents,
  onBatchGenerated,
}) => {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  });
  const [dueDate, setDueDate] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 10);
    return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState(() => {
    const today = new Date();
    return `Mes de ${today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected student IDs (supports initial pre-selection)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(initialSelectedStudentIds || []);
  });
  const [fillWithBlanks, setFillWithBlanks] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync if initialSelectedStudentIds changes (adjust state pattern)
  const [prevInitial, setPrevInitial] = useState(initialSelectedStudentIds);
  if (initialSelectedStudentIds !== prevInitial) {
    setPrevInitial(initialSelectedStudentIds);
    setSelectedIds(new Set(initialSelectedStudentIds || []));
  }

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      return fullName.includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [students, searchQuery]);

  // Multiple of 10 calculations
  const selectedCount = selectedIds.size;
  const remainder = selectedCount % 10;
  const isMultipleOf10 = remainder === 0;
  const blanksNeeded = isMultipleOf10 ? 0 : 10 - remainder;
  const totalPages = Math.ceil(selectedCount / 10);

  // Toggle single student
  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all filtered students
  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  // Deselect all filtered students
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Execute generation with or without blank fillers
  const executeGeneration = async (withBlanks: boolean) => {
    if (selectedCount === 0) return;
    setLoading(true);
    setError(null);

    try {
      const studentIdsArray = Array.from(selectedIds);
      const generated = await invoiceApi.generateBatch({
        student_ids: studentIdsArray,
        start_date: startDate,
        end_date: endDate,
        due_date: dueDate,
        notes: notes.trim() || undefined,
      });

      onBatchGenerated(generated, withBlanks);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al generar recibos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    if (selectedCount === 0) return;
    if (!isMultipleOf10) {
      setShowWarningModal(true);
    } else {
      executeGeneration(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Generación de Recibos en Lote (10 por hoja A4)
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Optimizado A4 (2×5)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calcula la asistencia y genera recibos oficiales en lotes de 10 por página de impresión.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Memo Settings Grid */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Periodo de Facturación y Datos del Recibo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Inicio Periodo *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Fin Periodo *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha Límite de Pago
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Concepto / Mensualidad
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Mes de Octubre 2026"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Student Selection Section */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Selección de Alumnos ({selectedCount} seleccionados)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                >
                  Seleccionar Todo ({filteredStudents.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre de alumno o correo..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Students Checkbox List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No se encontraron alumnos coincidentes.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isChecked = selectedIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-indigo-600">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">
                            {s.first_name} {s.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.email} {s.guardian_name ? `• Tutor: ${s.guardian_name}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-medium text-slate-500">
                        {s.status === 'active' ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Activo
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Multiple of 10 Warning Banner & Choice Actions */}
            {selectedCount > 0 && !isMultipleOf10 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-amber-900">
                    <strong className="font-bold">
                      Aviso de Optimización de Impresión A4 (10 recibos por página)
                    </strong>
                    <p className="text-amber-800 leading-relaxed">
                      Has seleccionado <strong>{selectedCount} alumnos</strong>. Cada hoja A4 contiene 
                      exactamente 10 recibos (rejilla 2×5). Para completar <strong>{totalPages} hoja(s) entera(s)</strong>, 
                      faltan <strong>{blanksNeeded} recibo(s)</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Option 1: Fill with blanks */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={fillWithBlanks}
                      onChange={(e) => setFillWithBlanks(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Rellenar automáticamente los {blanksNeeded} huecos con recibos en blanco</span>
                  </label>

                  {/* Option 2: Select more students */}
                  {onCloseToSelectStudents && (
                    <button
                      type="button"
                      onClick={onCloseToSelectStudents}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Seleccionar más alumnos
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Perfect Multiple of 10 Success Badge */}
            {selectedCount > 0 && isMultipleOf10 && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    ¡Perfecto! <strong>{selectedCount} alumnos</strong> completan exactamente <strong>{totalPages} hoja(s) A4</strong> completas (10 recibos/hoja).
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {totalPages} {totalPages === 1 ? 'Hoja A4' : 'Hojas A4'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedCount === 0 ? (
              <span>Selecciona al menos 1 alumno para generar el lote</span>
            ) : (
              <span>
                Se generarán <strong>{selectedCount} recibos</strong> • {totalPages} página(s) A4 resultante(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={selectedCount === 0 || loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generando Lote...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>
                    Generar {selectedCount} Recibos
                    {selectedCount > 0 ? ` (${totalPages} ${totalPages === 1 ? 'Hoja' : 'Hojas'} A4)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Warning Modal when selected count is not a multiple of 10 */}
      <BatchMultipleWarningModal
        isOpen={showWarningModal}
        selectedCount={selectedCount}
        onClose={() => {
          setShowWarningModal(false);
          if (onCloseToSelectStudents) {
            onCloseToSelectStudents();
          }
        }}
        onConfirmWithBlanks={() => {
          setShowWarningModal(false);
          executeGeneration(true);
        }}
      />
    </div>
  );
};
