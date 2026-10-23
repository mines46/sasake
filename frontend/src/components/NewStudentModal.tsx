import { useState } from 'react';
import { X, UserPlus, Shield, UserCheck, CheckCircle2, GraduationCap, School } from 'lucide-react';
import type { Student, StudentStatus } from '../types';

interface NewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStudent: (student: Student) => void;
  studentToEdit?: Student | null;
}

interface FormInnerProps {
  studentToEdit?: Student | null;
  onSubmit: (student: Student) => void;
  onClose: () => void;
}

const StudentFormInner: React.FC<FormInnerProps> = ({
  studentToEdit,
  onSubmit,
  onClose,
}) => {
  const [firstName, setFirstName] = useState(studentToEdit?.first_name || '');
  const [lastName, setLastName] = useState(studentToEdit?.last_name || '');
  const [email, setEmail] = useState(studentToEdit?.email || '');
  const [phone, setPhone] = useState(studentToEdit?.phone || '');
  const [courseYear, setCourseYear] = useState(studentToEdit?.course_year || '');
  const [schoolName, setSchoolName] = useState(studentToEdit?.school_name || '');
  
  // Default to false (most students are adults over 18)
  const [isMinor, setIsMinor] = useState<boolean>(
    studentToEdit?.is_minor !== undefined
      ? studentToEdit.is_minor
      : Boolean(studentToEdit?.guardian_name && studentToEdit.guardian_name.trim() !== '')
  );

  const [guardianName, setGuardianName] = useState(studentToEdit?.guardian_name || '');
  const [guardianPhone, setGuardianPhone] = useState(studentToEdit?.guardian_phone || '');
  const [status, setStatus] = useState<StudentStatus>(studentToEdit?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isMinor && !guardianName.trim()) {
      alert('Al marcar que el alumno requiere tutor legal o es menor de edad, es necesario ingresar el nombre del tutor.');
      return;
    }

    const studentData: Student = {
      id: studentToEdit ? studentToEdit.id : `std-${Date.now()}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      is_minor: isMinor,
      guardian_name: isMinor ? (guardianName.trim() || undefined) : undefined,
      guardian_phone: isMinor ? (guardianPhone.trim() || undefined) : undefined,
      course_year: courseYear.trim() || undefined,
      school_name: schoolName.trim() || undefined,
      status,
      created_at: studentToEdit ? studentToEdit.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSubmit(studentData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Student Personal Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="ej. Elena"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Apellidos *
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="ej. Rostova"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email del Alumno *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="elena@encina.com"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Teléfono del Alumno
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 611 234 567"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Academic Background / Course & School */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            Curso y Año Académico
          </label>
          <input
            type="text"
            value={courseYear}
            onChange={(e) => setCourseYear(e.target.value)}
            placeholder="ej. 2º Bachillerato, 4º ESO..."
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-indigo-600" />
            Centro Educativo / Instituto
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="ej. IES Virgen Blanca"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Estado de Matrícula
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StudentStatus)}
          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
        >
          <option value="active">Activo (Matriculado y Asistiendo)</option>
          <option value="inactive">Inactivo (En pausa / Baja)</option>
          <option value="suspended">Suspendido</option>
        </select>
      </div>

      {/* Minor / Requires Tutor Checkbox Selector */}
      <div className="pt-2 border-t border-slate-100">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 transition-colors">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                El alumno es menor de 18 años / Requiere tutor legal
              </span>
              <span className="text-slate-500 text-[11px] block mt-0.5 leading-relaxed">
                {isMinor
                  ? 'Se habilitan los campos para registrar los datos del padre, madre o tutor legal responsable.'
                  : 'Desmarcado por defecto: la mayoría de alumnos son mayores de edad (+18 años) con contacto directo.'}
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Adult Note vs Guardian Information Section */}
      {!isMinor ? (
        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Alumno mayor de edad (+18 años):</strong> No requiere tutor legal. Toda la comunicación y los recibos se emiten a su nombre directamente.
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Datos del Tutor o Representante Legal</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Tutor / Padre / Madre *
              </label>
              <input
                type="text"
                required={isMinor}
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="ej. Mikhail Rostov"
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Contacto del Tutor
              </label>
              <input
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+34 611 234 500"
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          {studentToEdit ? 'Guardar Cambios' : 'Registrar Alumno'}
        </button>
      </div>
    </form>
  );
};

export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  isOpen,
  onClose,
  onCreateStudent,
  studentToEdit,
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {studentToEdit ? 'Editar Ficha de Alumno' : 'Registrar Nuevo Alumno'}
              </h3>
              <p className="text-xs text-slate-500">
                {studentToEdit ? 'Actualizar información del alumno y tutor legal' : 'Ficha de contacto del alumno y tutor (si es menor)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Form */}
        <StudentFormInner
          key={studentToEdit ? studentToEdit.id : 'new'}
          studentToEdit={studentToEdit}
          onSubmit={(data) => {
            onCreateStudent(data);
            onClose();
          }}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
