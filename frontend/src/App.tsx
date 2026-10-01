import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './pages/BillingPage';
import { StudentsPage } from './pages/StudentsPage';
import { 
  BookOpen, 
  CalendarDays, 
  Settings, 
  ArrowLeft 
} from 'lucide-react';
import { 
  mockRecentInvoices, 
  mockStudents, 
  mockClasses,
  mockEnrollments,
  mockAttendanceHistory
} from './data/mockData';
import type { 
  EnrichedInvoice, 
  Student, 
  ClassItem 
} from './types';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // App-level shared states
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>(mockRecentInvoices);
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [classes] = useState<ClassItem[]>(mockClasses);

  // Quick action modal triggers
  const [isNewStudentOpen, setIsNewStudentOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  // Handlers for state modifications
  const handleAddInvoice = (newInvoice: EnrichedInvoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  const handleMarkInvoicePaid = (id: string) => {
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

  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  // Tab details for remaining secondary modules
  const tabDetails: Record<string, { title: string; desc: string; icon: any }> = {
    classes: {
      title: 'Classes & Courses',
      desc: 'Define course curricula, classroom assignments, instructors, and cost per session rates.',
      icon: BookOpen,
    },
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
            />
          ) : activeTab === 'invoices' ? (
            /* Priority Billing & Invoicing Module */
            <BillingPage
              invoices={invoices}
              onAddInvoice={handleAddInvoice}
              onMarkInvoicePaid={handleMarkInvoicePaid}
              classes={classes}
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
