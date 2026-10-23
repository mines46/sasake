import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { StudentsPage } from './pages/StudentsPage';
import { ClassesPage } from './pages/ClassesPage';
import { 
  CalendarDays, 
  Settings, 
  ArrowLeft 
} from 'lucide-react';
import { 
  mockEnrollments, 
  mockAttendanceHistory, 
  mockClassSchedules 
} from './data/mockData';
import type { 
  EnrichedInvoice, 
  Student, 
  ClassItem, 
  User 
} from './types';
import { studentApi } from './api/students';
import { classApi } from './api/classes';
import { invoiceApi } from './api/invoices';

const getInitialUser = (): User | null => {
  try {
    const raw = localStorage.getItem('sasake_auth_user');
    if (raw) {
      return JSON.parse(raw) as User;
    }
  } catch {
    // ignore parse error
  }
  return null;
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getInitialUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // App-level live data states (clean empty initial arrays for production)
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Fetch live academy data on login
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      return;
    }

    let isMounted = true;
    const loadLiveData = async () => {
      try {
        const [studentsRes, classesRes, invoicesRes] = await Promise.allSettled([
          studentApi.getAll(),
          classApi.getAll(),
          invoiceApi.getAll(),
        ]);

        if (!isMounted) return;

        if (studentsRes.status === 'fulfilled') {
          setStudents(studentsRes.value);
        }
        if (classesRes.status === 'fulfilled') {
          setClasses(classesRes.value);
        }
        if (invoicesRes.status === 'fulfilled') {
          setInvoices(invoicesRes.value);
        }
      } catch (err) {
        console.error('Failed to load live data:', err);
      }
    };

    loadLiveData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Quick action modal triggers
  const [isNewStudentOpen, setIsNewStudentOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  // Compute pending & overdue invoices count for sidebar notification badge
  const dueInvoiceCount = useMemo(() => {
    return invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').length;
  }, [invoices]);

  // Auth handlers
  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('sasake_auth_user', JSON.stringify(user));
    localStorage.setItem('sasake_auth_token', token);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('sasake_auth_user');
    localStorage.removeItem('sasake_auth_token');
    setCurrentUser(null);
  };

  const handleUpdateCurrentUser = (updated: User) => {
    setCurrentUser(updated);
    try {
      localStorage.setItem('sasake_auth_user', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Handlers for state modifications
  const handleAddInvoice = (newInvoice: EnrichedInvoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  const handleAddInvoices = (newInvoices: EnrichedInvoice[]) => {
    setInvoices((prev) => [...newInvoices, ...prev]);
  };

  const handleMarkInvoicePaid = (id: string) => {
    invoiceApi.updateStatus(id, 'paid').catch(() => {
      // Offline fallback
    });

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          return {
            ...inv,
            status: 'paid',
            paid_at: new Date().toISOString(),
          };
        }
        return inv;
      })
    );
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      const created = await studentApi.create({
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        email: newStudent.email,
        phone: newStudent.phone,
        is_minor: newStudent.is_minor,
        guardian_name: newStudent.guardian_name,
        guardian_phone: newStudent.guardian_phone,
        course_year: newStudent.course_year,
        school_name: newStudent.school_name,
        status: newStudent.status,
      });
      setStudents((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
    } catch (err) {
      console.error('Failed to create student via API:', err);
      setStudents((prev) => [newStudent, ...prev]);
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      const updated = await studentApi.update(updatedStudent.id, {
        first_name: updatedStudent.first_name,
        last_name: updatedStudent.last_name,
        email: updatedStudent.email,
        phone: updatedStudent.phone,
        is_minor: updatedStudent.is_minor,
        guardian_name: updatedStudent.guardian_name,
        guardian_phone: updatedStudent.guardian_phone,
        course_year: updatedStudent.course_year,
        school_name: updatedStudent.school_name,
        status: updatedStudent.status,
      });
      setStudents((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (err) {
      console.error('Failed to update student via API:', err);
      setStudents((prev) =>
        prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );
    }
  };

  const handleAddClass = async (newClass: ClassItem) => {
    try {
      const created = await classApi.create({
        name: newClass.name,
        description: newClass.description,
        instructor_name: newClass.instructor_name,
        capacity: newClass.capacity,
        cost_per_session_cents: newClass.cost_per_session_cents,
        price_cents: newClass.price_cents,
        billing_period: newClass.billing_period,
        class_type: newClass.class_type,
        is_active: newClass.is_active,
      });
      setClasses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
    } catch (err) {
      console.error('Failed to create class via API:', err);
      setClasses((prev) => [newClass, ...prev]);
    }
  };

  const handleUpdateClass = async (updatedClass: ClassItem) => {
    try {
      const updated = await classApi.update(updatedClass.id, {
        name: updatedClass.name,
        description: updatedClass.description,
        instructor_name: updatedClass.instructor_name,
        capacity: updatedClass.capacity,
        cost_per_session_cents: updatedClass.cost_per_session_cents,
        price_cents: updatedClass.price_cents,
        billing_period: updatedClass.billing_period,
        class_type: updatedClass.class_type,
        is_active: updatedClass.is_active,
      });
      setClasses((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      console.error('Failed to update class via API:', err);
      setClasses((prev) =>
        prev.map((c) => (c.id === updatedClass.id ? updatedClass : c))
      );
    }
  };

  // Tab details for remaining secondary modules
  const tabDetails: Record<string, { title: string; desc: string; icon: any }> = {
    schedule: {
      title: 'Timetable & Class Schedules',
      desc: 'Weekly recurring slot distribution, room allocations, and instructor schedules.',
      icon: CalendarDays,
    },
    settings: {
      title: 'Academy System Settings',
      desc: 'Academy preferences, academic terms, room configurations, and system backups.',
      icon: Settings,
    },
  };

  // 1. If unauthenticated, show the Login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Role Admin: ONLY allowed to view, add, and manage users
  if (currentUser.role === 'admin') {
    return (
      <AdminUsersPage 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        onUpdateCurrentUser={handleUpdateCurrentUser} 
      />
    );
  }

  // 3. Role Teacher: Full access to the whole academy application
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        studentCount={students.length}
        classCount={classes.length}
        dueInvoiceCount={dueInvoiceCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenNewStudent={() => setIsNewStudentOpen(true)}
          onOpenNewInvoice={() => setIsNewInvoiceOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' ? (
            <DashboardPage
              searchQuery={searchQuery}
              isNewStudentOpen={isNewStudentOpen}
              setIsNewStudentOpen={setIsNewStudentOpen}
              isNewInvoiceOpen={isNewInvoiceOpen}
              setIsNewInvoiceOpen={setIsNewInvoiceOpen}
              onNavigateTab={(tab) => setActiveTab(tab)}
              invoices={invoices}
              onAddInvoice={handleAddInvoice}
              onMarkInvoicePaid={handleMarkInvoicePaid}
              students={students}
              onAddStudent={handleAddStudent}
              classes={classes}
            />
          ) : activeTab === 'students' ? (
            /* Students & Guardian Directory */
            <StudentsPage
              students={students}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              classes={classes}
              enrollments={mockEnrollments}
              attendanceHistory={mockAttendanceHistory}
              onNavigateToBilling={() => setActiveTab('invoices')}
              onBatchGenerated={handleAddInvoices}
            />
          ) : activeTab === 'invoices' ? (
            /* Priority Billing & Invoicing Module */
            <BillingPage
              invoices={invoices}
              onAddInvoice={handleAddInvoice}
              onAddInvoices={handleAddInvoices}
              onMarkInvoicePaid={handleMarkInvoicePaid}
              classes={classes}
              students={students}
              enrollments={mockEnrollments}
              schedules={mockClassSchedules}
              attendanceHistory={mockAttendanceHistory}
            />
          ) : activeTab === 'classes' ? (
            /* Classes & Curriculum Management Module */
            <ClassesPage
              classes={classes}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              enrollments={mockEnrollments}
              students={students}
              schedules={mockClassSchedules}
            />
          ) : (
            /* Subpage placeholder for remaining modules */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs text-center space-y-4 max-w-xl mx-auto my-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                {(() => {
                  const Icon = tabDetails[activeTab]?.icon || Settings;
                  return <Icon className="w-7 h-7" />;
                })()}
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {tabDetails[activeTab]?.title || 'Module'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                  {tabDetails[activeTab]?.desc}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 text-left">
                <span className="font-semibold text-slate-800 block mb-1">Module Pipeline:</span>
                This section connects to the backend REST endpoints (e.g. <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600">/api/{activeTab}</code>).
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
