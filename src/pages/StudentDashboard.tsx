import { useState, useEffect } from 'react';
import { LogOut, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StudentBottomNav } from '@/components/BottomNav';
import { StudentCalendar } from '@/components/StudentCalendar';
import { StudentFees } from '@/components/StudentFees';
import { StudentSettings } from '@/components/StudentSettings';
import { StudentHome } from '@/components/StudentHome';
import type { Absence, MessLeave } from '@/lib/supabase';
import { getDaysInMonth, getMonthName, todayString, dateRange } from '@/lib/utils';

export function StudentDashboard() {
  const { student, hostel, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [messLeaves, setMessLeaves] = useState<MessLeave[]>([]);

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  useEffect(() => {
    if (!student) return;
    loadAbsences();
  }, [student]);

  async function loadAbsences() {
    if (!student) return;
    const [absRes, leavesRes] = await Promise.all([
      supabase
        .from('absences')
        .select('*')
        .eq('student_id', student.id)
        .order('absent_date', { ascending: true }),
      supabase
        .from('mess_leaves')
        .select('*')
        .eq('hostel_id', student.hostel_id)
        .order('start_date', { ascending: true }),
    ]);
    setAbsences(absRes.data || []);
    setMessLeaves(leavesRes.data || []);
  }

  const today = todayString();
  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    for (const d of dateRange(ml.start_date, ml.end_date)) {
      messLeaveDates.add(d);
    }
  }
  const messLeaveAbsences: Absence[] = Array.from(messLeaveDates).map((d) => ({
    id: `mess-leave-${d}`,
    student_id: student!.id,
    absent_date: d,
    created_at: '',
  }));
  const allAbsences: Absence[] = [...absences, ...messLeaveAbsences];
  const isAbsentToday = allAbsences.some((a) => a.absent_date === today);

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const monthAbsences = allAbsences.filter((a) => {
    const d = new Date(a.absent_date);
    return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
  });
  const presentDays = daysInMonth - monthAbsences.length;

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
              <p className="text-sm font-bold text-slate-900">Hostel Mess Cut</p>
              <p className="text-[11px] text-slate-500">{hostel?.name || 'Student'}</p>
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
          <StudentHome
            student={student!}
            hostel={hostel!}
            isAbsentToday={isAbsentToday}
            absences={allAbsences}
            onNavigate={setActiveTab}
            onAbsenceChange={loadAbsences}
          />
        )}

        {activeTab === 'calendar' && (
          <StudentCalendar
            absences={allAbsences}
            month={calendarMonth}
            year={calendarYear}
            onMonthChange={(m, y) => {
              setCalendarMonth(m);
              setCalendarYear(y);
            }}
            presentDays={presentDays}
            daysInMonth={daysInMonth}
            monthName={getMonthName(calendarMonth)}
          />
        )}

        {activeTab === 'fees' && <StudentFees student={student!} hostel={hostel!} absences={allAbsences} />}

        {activeTab === 'settings' && <StudentSettings student={student!} hostel={hostel!} onSignOut={signOut} />}
      </div>

      <StudentBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
