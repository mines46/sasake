import { useState } from 'react';
import { X, BookOpen, DollarSign, Users, Sparkles, Layers, UserCheck } from 'lucide-react';
import type { ClassItem, BillingPeriod, ClassType } from '../types';

interface NewClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClass: (newClass: ClassItem) => void;
  classToEdit?: ClassItem | null;
}

interface ClassFormInnerProps {
  classToEdit?: ClassItem | null;
  onSubmit: (cls: ClassItem) => void;
  onClose: () => void;
}

const ClassFormInner: React.FC<ClassFormInnerProps> = ({
  classToEdit,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(classToEdit?.name || '');
  const [description, setDescription] = useState(classToEdit?.description || '');
  const [instructorName, setInstructorName] = useState(classToEdit?.instructor_name || '');
  const [capacity, setCapacity] = useState(classToEdit ? String(classToEdit.capacity) : '15');
  const [classType, setClassType] = useState<ClassType>(classToEdit?.class_type || 'group');
  const [costPerSessionDollars, setCostPerSessionDollars] = useState(
    classToEdit ? (classToEdit.cost_per_session_cents / 100).toFixed(2) : '25.00'
  );
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    classToEdit?.billing_period || 'monthly'
  );
  const [isActive, setIsActive] = useState<boolean>(
    classToEdit ? classToEdit.is_active : true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const costCents = Math.round(parseFloat(costPerSessionDollars || '0') * 100);

    const classData: ClassItem = {
      id: classToEdit ? classToEdit.id : `cls-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      instructor_name: instructorName.trim() || undefined,
      capacity: parseInt(capacity, 10) || 15,
      cost_per_session_cents: costCents,
      price_cents: costCents * 8, // Standard estimate for 8 sessions/month
      billing_period: billingPeriod,
      class_type: classType,
      is_active: isActive,
      created_at: classToEdit ? classToEdit.created_at : new Date().toISOString(),
    };

    onSubmit(classData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Class / Course Title *
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Advanced Robotics & Microcontrollers"
          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Course Description & Syllabus Summary
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the course, target skill levels, prerequisites..."
          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Assigned Instructor
          </label>
          <input
            type="text"
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Max Student Capacity
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Users className="w-3.5 h-3.5" />
            </span>
            <input
              type="number"
              min="1"
              max="100"
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Class Modality & Billing Rule */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Class Modality & Billing Rule *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setClassType('group')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              classType === 'group'
                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Grupal</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Cobro mensual por adelantado de todas las sesiones del mes.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setClassType('individual')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              classType === 'individual'
                ? 'border-purple-600 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20'
                : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Individual</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Cobro según asistencias registradas (asistidas + faltas sin justificar).
            </p>
          </button>
        </div>
      </div>

      {/* Priority Session-Based Billing Setting */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/90 to-purple-50/60 border border-indigo-100 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
          <DollarSign className="w-4 h-4 text-indigo-600" />
          Session-Based Tuition Rate (Used for Recibos)
        </div>
        <p className="text-[11px] text-slate-600 leading-normal">
          This base fee is charged per attended session (including unexcused absences) when calculating student invoices.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cost Per Session (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={costPerSessionDollars}
                onChange={(e) => setCostPerSessionDollars(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Billing Period
            </label>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="monthly">Monthly Recurring</option>
              <option value="hourly">Hourly Rate</option>
              <option value="course">Entire Course Package</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="is_active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
        />
        <label htmlFor="is_active" className="text-xs font-medium text-slate-700 cursor-pointer">
          Class is currently active and open for student enrollments
        </label>
      </div>

      {/* Form Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {classToEdit ? 'Save Changes' : 'Create Class'}
        </button>
      </div>
    </form>
  );
};

export const NewClassModal: React.FC<NewClassModalProps> = ({
  isOpen,
  onClose,
  onCreateClass,
  classToEdit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {classToEdit ? 'Edit Class Details' : 'Create New Class'}
              </h3>
              <p className="text-xs text-slate-500">
                {classToEdit ? 'Update course specifications & session billing price' : 'Specify course details & cost per session for billing'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Form keyed to class ID or 'new' to prevent state mismatch */}
        <ClassFormInner
          key={classToEdit ? classToEdit.id : 'new'}
          classToEdit={classToEdit}
          onSubmit={(cls) => {
            onCreateClass(cls);
            onClose();
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
