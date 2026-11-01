import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import type { Absence } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

type StudentCalendarProps = {
  absences: Absence[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  presentDays: number;
  daysInMonth: number;
  monthName: string;
};

export function StudentCalendar({
  absences,
  month,
  year,
  onMonthChange,
  presentDays,
  daysInMonth,
  monthName,
}: StudentCalendarProps) {
  const absenceDates = new Set(absences.map((a) => a.absent_date));
  const today = formatDate(new Date());

  const firstDay = new Date(year, month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  }

  function nextMonth() {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">
        <p className="text-sm text-teal-100">Attendance Summary</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-bold">{presentDays}</span>
          <span className="mb-1 text-sm text-teal-100">/ {daysInMonth} days present</span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Present: {presentDays}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            Absent: {daysInMonth - presentDays}
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <p className="text-base font-bold text-slate-900">
            {monthName} {year}
          </p>
          <button onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-slate-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAbsent = absenceDates.has(dateStr);
            const isToday = dateStr === today;
            const isFuture = dateStr > today;

            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-lg text-sm relative ${
                  isAbsent
                    ? 'bg-rose-50 text-rose-500'
                    : isFuture
                    ? 'bg-slate-50 text-slate-300'
                    : 'bg-emerald-50 text-emerald-700'
                } ${isToday ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}
              >
                {day}
                {isAbsent && (
                  <XCircle className="absolute top-0.5 right-0.5 h-3 w-3 text-rose-400" />
                )}
                {!isAbsent && !isFuture && (
                  <CheckCircle2 className="absolute top-0.5 right-0.5 h-3 w-3 text-emerald-400" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-200" />
            Present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-rose-50 border border-rose-200" />
            Absent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-slate-50 border border-slate-200" />
            Future
          </span>
        </div>
      </div>
    </div>
  );
}
