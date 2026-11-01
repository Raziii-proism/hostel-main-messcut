import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Users, X, Loader2, Search, UserCheck } from 'lucide-react';
import type { Absence, Student, MessLeave } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatDate, getDaysInMonth, getMonthName, dateRange } from '@/lib/utils';

type WardenCalendarProps = {
  students: Student[];
  absences: Absence[];
  messLeaves: MessLeave[];
  onDataChange?: () => void;
};

export function WardenCalendar({ students, absences, messLeaves, onDataChange }: WardenCalendarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'byDay' | 'byStudent'>('byDay');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentCount = students.length;
  const daysInMonth = getDaysInMonth(year, month);
  const today = formatDate(now);

  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    for (const d of dateRange(ml.start_date, ml.end_date)) {
      const dt = new Date(d + 'T00:00:00');
      if (dt.getMonth() === month && dt.getFullYear() === year) {
        messLeaveDates.add(d);
      }
    }
  }

  const totalPresentDays = studentCount * daysInMonth - monthAbsences.length - messLeaveDates.size * studentCount;

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function getPresentCount(dateStr: string): number {
    if (messLeaveDates.has(dateStr)) return 0;
    const absentCount = monthAbsences.filter((a) => a.absent_date === dateStr).length;
    return studentCount - absentCount;
  }

  function getPresentStudents(dateStr: string): Student[] {
    if (messLeaveDates.has(dateStr)) return [];
    const absentIds = new Set(monthAbsences.filter((a) => a.absent_date === dateStr).map((a) => a.student_id));
    return students.filter((s) => !absentIds.has(s.id));
  }

  const selectedPresent = selectedDay ? getPresentStudents(selectedDay) : [];
  const selectedAbsent = selectedDay
    ? students.filter((s) => !selectedPresent.some((p) => p.id === s.id))
    : [];

  const q = searchQuery.trim().toLowerCase();
  const filterFn = (s: Student) => !q || s.full_name.toLowerCase().includes(q) || (s.room_no || '').toLowerCase().includes(q);
  const filteredPresent = selectedPresent.filter(filterFn);
  const filteredAbsent = selectedAbsent.filter(filterFn);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || null;
  const selectedStudentAbsenceDates = new Set(
    monthAbsences.filter((a) => a.student_id === selectedStudentId).map((a) => a.absent_date)
  );

  async function toggleStudentDay(dateStr: string) {
    if (!selectedStudentId) return;
    setTogglingId(selectedStudentId);
    const isAbsent = selectedStudentAbsenceDates.has(dateStr);
    if (isAbsent) {
      await supabase
        .from('absences')
        .delete()
        .eq('student_id', selectedStudentId)
        .eq('absent_date', dateStr);
    } else {
      await supabase
        .from('absences')
        .insert({ student_id: selectedStudentId, absent_date: dateStr });
    }
    setTogglingId(null);
    onDataChange?.();
  }

  async function toggleAbsence(studentId: string, dateStr: string, isCurrentlyAbsent: boolean) {
    setTogglingId(studentId);
    if (isCurrentlyAbsent) {
      await supabase
        .from('absences')
        .delete()
        .eq('student_id', studentId)
        .eq('absent_date', dateStr);
    } else {
      await supabase
        .from('absences')
        .insert({ student_id: studentId, absent_date: dateStr });
    }
    setTogglingId(null);
    onDataChange?.();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">
        <p className="text-sm text-teal-100">Total Presents — {getMonthName(month)} {year}</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-bold">{totalPresentDays}</span>
          <span className="mb-1 text-sm text-teal-100">/ {studentCount * daysInMonth} possible</span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            Present: {totalPresentDays}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            Absent: {studentCount * daysInMonth - totalPresentDays}
          </span>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('byDay'); setSelectedStudentId(null); setSelectedDay(null); }}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
            mode === 'byDay'
              ? 'border-teal-500 bg-teal-50 text-teal-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          By Day
        </button>
        <button
          onClick={() => { setMode('byStudent'); setSelectedDay(null); }}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
            mode === 'byStudent'
              ? 'border-teal-500 bg-teal-50 text-teal-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          By Student
        </button>
      </div>

      {/* Student picker for byStudent mode */}
      {mode === 'byStudent' && (
        <div className="card animate-scale-in">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-teal-500" />
            <p className="text-sm font-bold text-slate-900">Select a Student</p>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name or room..."
              className="input-field pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {students.filter(filterFn).map((s) => {
              const absentDays = monthAbsences.filter((a) => a.student_id === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id === selectedStudentId ? null : s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 transition-all ${
                    selectedStudentId === s.id
                      ? 'bg-teal-50 border border-teal-300 ring-1 ring-teal-300'
                      : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    selectedStudentId === s.id ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{s.full_name}</p>
                    {s.room_no && <p className="text-[11px] text-slate-400">Room {s.room_no}</p>}
                  </div>
                  {absentDays > 0 && (
                    <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">
                      {absentDays} absent
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedStudent && (
            <div className="mt-3 rounded-xl bg-teal-50 border border-teal-100 px-4 py-2.5">
              <p className="text-xs text-teal-700">
                <span className="font-semibold">{selectedStudent.full_name}</span> selected. Tap calendar days to toggle absence.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <p className="text-base font-bold text-slate-900">
            {getMonthName(month)} {year}
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
            const presentCount = getPresentCount(dateStr);
            const isToday = dateStr === today;
            const isMessLeave = messLeaveDates.has(dateStr);
            const isSelected = selectedDay === dateStr;

            const studentIsAbsent = mode === 'byStudent' && selectedStudentId && selectedStudentAbsenceDates.has(dateStr);
            const studentIsPresent = mode === 'byStudent' && selectedStudentId && !studentIsAbsent && !isMessLeave;

            return (
              <button
                key={i}
                onClick={() => {
                  if (mode === 'byStudent' && selectedStudentId) {
                    if (!isMessLeave) toggleStudentDay(dateStr);
                  } else {
                    setSelectedDay(isSelected ? null : dateStr);
                  }
                }}
                disabled={mode === 'byStudent' && (!selectedStudentId || isMessLeave)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs relative transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === 'byStudent' && selectedStudentId
                    ? studentIsAbsent
                      ? 'bg-rose-500 text-white'
                      : studentIsPresent
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : isMessLeave
                      ? 'bg-rose-50 text-rose-400'
                      : 'bg-slate-50 text-slate-400'
                    : isSelected
                    ? 'bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1'
                    : isMessLeave
                    ? 'bg-rose-50 text-rose-400 hover:bg-rose-100'
                    : presentCount === studentCount
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : presentCount === 0
                    ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                } ${isToday && !isSelected && !(mode === 'byStudent' && selectedStudentId) ? 'ring-2 ring-teal-400 ring-offset-1' : ''}`}
              >
                <span className="font-semibold">{day}</span>
                {mode === 'byStudent' && selectedStudentId ? (
                  <span className="text-[10px] leading-none mt-0.5">
                    {isMessLeave ? '—' : studentIsAbsent ? <XCircle className="h-3 w-3 mx-auto" /> : <CheckCircle2 className="h-3 w-3 mx-auto text-emerald-400" />}
                  </span>
                ) : (
                  <span className={`text-[10px] leading-none mt-0.5 ${isSelected ? 'text-teal-100' : 'opacity-70'}`}>
                    {presentCount}/{studentCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-200" />
            All present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-50 border border-amber-200" />
            Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-rose-50 border border-rose-200" />
            None / Mess leave
          </span>
        </div>
      </div>

      {/* Selected day detail — only in byDay mode */}
      {mode === 'byDay' && selectedDay && (
        <div className="card animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedPresent.length} present / {selectedAbsent.length} absent
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          {messLeaveDates.has(selectedDay) ? (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
              <p className="text-sm font-medium text-rose-700">Mess Leave — no students present</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name or room..."
                  className="input-field pl-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">Tap a student to toggle their attendance for this day.</p>

              {/* Present students */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-700">Present ({filteredPresent.length}{searchQuery && ` of ${selectedPresent.length}`})</p>
                </div>
                {filteredPresent.length === 0 ? (
                  <p className="text-xs text-slate-400 ml-6">{selectedPresent.length === 0 ? 'No students present' : 'No matches'}</p>
                ) : (
                  <div className="space-y-1.5 ml-6">
                    {filteredPresent.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleAbsence(s.id, selectedDay, false)}
                        disabled={togglingId === s.id}
                        className="flex w-full items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 hover:bg-rose-50 transition-colors disabled:opacity-50"
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                        <p className="text-xs font-medium text-slate-700 flex-1 text-left">{s.full_name}</p>
                        {s.room_no && <span className="text-[11px] text-slate-400">· Room {s.room_no}</span>}
                        <XCircle className="h-3.5 w-3.5 text-rose-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Absent students */}
              {(selectedAbsent.length > 0 || searchQuery) && filteredAbsent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-rose-500" />
                    <p className="text-xs font-semibold text-rose-700">Absent ({filteredAbsent.length}{searchQuery && ` of ${selectedAbsent.length}`})</p>
                  </div>
                  <div className="space-y-1.5 ml-6">
                    {filteredAbsent.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleAbsence(s.id, selectedDay, true)}
                        disabled={togglingId === s.id}
                        className="flex w-full items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-rose-400" />
                        )}
                        <p className="text-xs font-medium text-slate-700 flex-1 text-left">{s.full_name}</p>
                        {s.room_no && <span className="text-[11px] text-slate-400">· Room {s.room_no}</span>}
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
