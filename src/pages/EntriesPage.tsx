import { useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Student, Absence, MessLeave } from '@/lib/supabase';
import { getMonthName, getDaysInMonth, formatDate, dateRange } from '@/lib/utils';
import { LoadingSpinner, ErrorBanner } from '@/components/Feedback';

type EntriesPageProps = {
  onBack: () => void;
};

const CUTOFF_HOUR = 12;

export function EntriesPage({ onBack }: EntriesPageProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [messLeaves, setMessLeaves] = useState<MessLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const todayStr = formatDate(now);
  const isAfterCutoff = now.getHours() > CUTOFF_HOUR || (now.getHours() === CUTOFF_HOUR && now.getMinutes() >= 10);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, absencesRes, leavesRes] = await Promise.all([
        supabase.from('students').select('*').order('full_name', { ascending: true }),
        supabase.from('absences').select('*'),
        supabase.from('mess_leaves').select('*'),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (absencesRes.error) throw absencesRes.error;
      if (leavesRes.error) throw leavesRes.error;

      setStudents(studentsRes.data || []);
      setAbsences(absencesRes.data || []);
      setMessLeaves(leavesRes.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    for (const d of dateRange(ml.start_date, ml.end_date)) {
      messLeaveDates.add(d);
    }
  }

  function isMessLeaveDay(dateStr: string): boolean {
    return messLeaveDates.has(dateStr);
  }

  function getPresentCountForDate(dateStr: string): number {
    if (isMessLeaveDay(dateStr)) return 0;
    const absentIds = absences.filter((a) => a.absent_date === dateStr).map((a) => a.student_id);
    return students.length - absentIds.length;
  }

  function getPresentStudentsForDate(dateStr: string): Student[] {
    if (isMessLeaveDay(dateStr)) return [];
    const absentIds = new Set(absences.filter((a) => a.absent_date === dateStr).map((a) => a.student_id));
    return students.filter((s) => !absentIds.has(s.id));
  }

  function getAbsentStudentsForDate(dateStr: string): Student[] {
    if (isMessLeaveDay(dateStr)) return students;
    const absentIds = new Set(absences.filter((a) => a.absent_date === dateStr).map((a) => a.student_id));
    return students.filter((s) => absentIds.has(s.id));
  }

  function handlePrevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  }

  function handleNextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  }

  const todayPresentCount = isAfterCutoff ? getPresentCountForDate(todayStr) : null;
  const selectedPresent = selectedDate ? getPresentStudentsForDate(selectedDate) : [];
  const selectedAbsent = selectedDate ? getAbsentStudentsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-slate-100">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-sm font-bold text-slate-900">Entries</p>
            <p className="text-[11px] text-slate-500">Daily attendance overview</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4 space-y-4">
        {loading ? (
          <LoadingSpinner message="Loading attendance..." />
        ) : (
          <>
            {error && <ErrorBanner message={error} />}

            {/* Today's attendance count */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-teal-100" />
                <p className="text-sm text-teal-100">
                  {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              {todayPresentCount !== null ? (
                <>
                  <p className="text-4xl font-bold">{todayPresentCount}</p>
                  <p className="mt-1 text-xs text-teal-100">
                    Students present today out of {students.length}
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <p className="text-xs text-teal-50">
                      Attendance is now locked for today. No further changes can be made.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-teal-50">Not yet available</p>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                    <Clock className="h-4 w-4 text-amber-200" />
                    <p className="text-xs text-teal-50">
                      Today's attendance count will be displayed after 12:10 PM.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Calendar */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <p className="text-sm font-bold text-slate-900">
                  {getMonthName(calendarMonth)} {calendarYear}
                </p>
                <button
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft size={18} className="rotate-180" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const presentCount = getPresentCountForDate(dateStr);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const isFuture = new Date(dateStr) > now && dateStr !== todayStr;
                  const isTodayAndBeforeCutoff = isToday && !isAfterCutoff;

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (!isFuture && !isTodayAndBeforeCutoff) {
                          setSelectedDate(isSelected ? null : dateStr);
                        }
                      }}
                      disabled={isFuture || isTodayAndBeforeCutoff}
                      className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all text-xs ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-md'
                          : isToday
                            ? 'bg-amber-50 border border-amber-200 text-amber-700'
                            : isFuture || isTodayAndBeforeCutoff
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-semibold">{day}</span>
                      {!isFuture && !isTodayAndBeforeCutoff && (
                        <span className={`text-[9px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                          {presentCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                <CalendarDays size={12} />
                Numbers show students present. Tap a date to see the full list.
              </p>
            </div>

            {/* Selected date details */}
            {selectedDate && (
              <div className="card animate-fade-in">
                <p className="text-sm font-bold text-slate-900 mb-1">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  {isMessLeaveDay(selectedDate) ? (
                    <span className="font-medium text-rose-500">Mess closed — all students marked absent</span>
                  ) : (
                    <>{selectedPresent.length} present, {selectedAbsent.length} absent</>
                  )}
                </p>

                {/* Present list */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Present ({selectedPresent.length})
                  </p>
                  {selectedPresent.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No students present.</p>
                  ) : (
                    selectedPresent.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{s.full_name}</p>
                          {s.room_no && <p className="text-[11px] text-slate-500">Room {s.room_no}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Absent list */}
                {selectedAbsent.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                      <XCircle size={14} /> Absent ({selectedAbsent.length})
                    </p>
                    {selectedAbsent.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2"
                      >
                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{s.full_name}</p>
                          {s.room_no && <p className="text-[11px] text-slate-500">Room {s.room_no}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
