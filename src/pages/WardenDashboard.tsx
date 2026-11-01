import { useState, useEffect } from 'react';
import { UtensilsCrossed, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { WardenBottomNav } from '@/components/BottomNav';
import { WardenHome } from '@/components/WardenHome';
import { WardenStudents } from '@/components/WardenStudents';
import { WardenFeeStatus } from '@/components/WardenFeeStatus';
import { WardenSettings } from '@/components/WardenSettings';
import { WardenCalendar } from '@/components/WardenCalendar';
import { WardenAnalytics } from '@/components/WardenAnalytics';
import type { Student, Absence, Bill, MessLeave, ExpenseItem } from '@/lib/supabase';

export function WardenDashboard() {
  const { warden, hostel, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [students, setStudents] = useState<Student[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [messLeaves, setMessLeaves] = useState<MessLeave[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);

  useEffect(() => {
    if (!warden || !hostel) return;
    loadData();
  }, [warden, hostel]);

  async function loadData() {
    if (!warden || !hostel) return;

    const { data: studentRows } = await supabase
      .from('students')
      .select('*')
      .eq('hostel_id', hostel.id)
      .order('full_name');

    const studentList = studentRows || [];
    const studentIds = studentList.map((s) => s.id);

    const [absencesRes, billsRes, leavesRes, expenseRes] = await Promise.all([
      studentIds.length > 0
        ? supabase
            .from('absences')
            .select('*, student_id')
            .in('student_id', studentIds)
            .order('absent_date', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('bills').select('*').eq('hostel_id', hostel.id).order('month', { ascending: false }),
      supabase.from('mess_leaves').select('*').eq('hostel_id', hostel.id).order('start_date', { ascending: false }),
      supabase.from('expense_items').select('*').eq('hostel_id', hostel.id).order('created_at', { ascending: true }),
    ]);

    setStudents(studentList);
    setAbsences(absencesRes.data || []);
    setBills(billsRes.data || []);
    setMessLeaves(leavesRes.data || []);
    setExpenseItems(expenseRes.data || []);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-slate-100">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600">
              <UtensilsCrossed className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Warden Panel</p>
              <p className="text-[11px] text-slate-500">{hostel?.name || 'Hostel'}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {activeTab === 'home' && (
          <WardenHome
            hostel={hostel!}
            studentCount={students.length}
            absences={absences}
            messLeaves={messLeaves}
            expenseItems={expenseItems}
            onSettings={() => setActiveTab('settings')}
            onStudents={() => setActiveTab('students')}
            onDataChange={loadData}
          />
        )}

        {activeTab === 'calendar' && (
          <WardenCalendar students={students} absences={absences} messLeaves={messLeaves} onDataChange={loadData} />
        )}

        {activeTab === 'students' && (
          <WardenStudents
            students={students}
            absences={absences}
            messLeaves={messLeaves}
            hostel={hostel!}
            onDataChange={loadData}
          />
        )}

        {activeTab === 'fees' && (
          <WardenFeeStatus students={students} bills={bills} absences={absences} messLeaves={messLeaves} hostel={hostel!} expenseItems={expenseItems} onDataChange={loadData} />
        )}

        {activeTab === 'analytics' && (
          <WardenAnalytics expenseItems={expenseItems} />
        )}

        {activeTab === 'settings' && (
          <WardenSettings hostel={hostel!} onSignOut={signOut} onDataChange={loadData} />
        )}
      </div>

      <WardenBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
