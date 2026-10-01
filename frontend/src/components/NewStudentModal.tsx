import { useState } from 'react';
import { X, UserPlus, Shield } from 'lucide-react';
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
  const [guardianName, setGuardianName] = useState(studentToEdit?.guardian_name || '');
  const [guardianPhone, setGuardianPhone] = useState(studentToEdit?.guardian_phone || '');
  const [status, setStatus] = useState<StudentStatus>(studentToEdit?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const studentData: Student = {
      id: studentToEdit ? studentToEdit.id : `std-${Date.now()}`,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      guardian_name: guardianName.trim() || undefined,
      guardian_phone: guardianPhone.trim() || undefined,
      status,
      created_at: studentToEdit ? studentToEdit.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSubmit(studentData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            First Name *
          </label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Elena"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Rostova"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Student Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="elena@example.com"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Student Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 234-8901"
            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Enrollment Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StudentStatus)}
          className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
        >
          <option value="active">Active (Enrolled & Attending)</option>
          <option value="inactive">Inactive (Paused / On Leave)</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Guardian Information */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          Emergency Guardian Info
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Guardian Name
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="e.g. Mikhail Rostov"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Guardian Phone
            </label>
            <input
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="+1 (555) 234-8900"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
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
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
        >
          {studentToEdit ? 'Save Changes' : 'Register Student'}
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
                {studentToEdit ? 'Edit Student Profile' : 'Register New Student'}
              </h3>
              <p className="text-xs text-slate-500">
                {studentToEdit ? 'Update student information & guardian emergency contact' : 'Add student record and guardian emergency contact'}
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

        {/* Inner Form keyed to student ID or 'new' to prevent effect cascading renders */}
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
