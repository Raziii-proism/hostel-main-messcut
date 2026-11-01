import { useState } from 'react';
import { CalendarX, Receipt, TrendingUp, Clock, CheckCircle2, XCircle, ChevronRight, CalendarPlus, Trash2 } from 'lucide-react';
import type { Student, Hostel, Absence } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getDaysInMonth, getMonthName, todayString, formatDate } from '@/lib/utils';

type StudentHomeProps = {
  student: Student;
  hostel: Hostel;
  isAbsentToday: boolean;
  absences: Absence[];
  onNavigate: (tab: string) => void;
  onAbsenceChange: () => void;
};

export function StudentHome({ student, hostel, isAbsentToday, absences, onNavigate, onAbsenceChange }: StudentHomeProps) {
  const [showMarkAbsent, setShowMarkAbsent] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [marking, setMarking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = getDaysInMonth(year, month);
  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const presentDays = daysInMonth - monthAbsences.length;

  // Min date: tomorrow. Max date: 1 month from today.
  const tomorrowStr = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return formatDate(t);
  })();
  const maxDateStr = (() => {
    const t = new Date();
    t.setMonth(t.getMonth() + 1);
    return formatDate(t);
  })();

  // Upcoming absences (today and future)
  const upcomingAbsences = absences
    .filter((a) => a.absent_date >= todayString())
    .sort((a, b) => a.absent_date.localeCompare(b.absent_date));

  function canMarkAbsentForDate(dateStr: string): { allowed: boolean; reason: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays < 1) {
      return { allowed: false, reason: 'You can only mark absence for future dates (starting tomorrow).' };
    }
    if (diffDays > 31) {
      return { allowed: false, reason: 'You can only mark absence up to 1 month in advance.' };
    }

    // Cutoff is fixed at 12:10 PM on the day before the absent date.
    const dayBefore = new Date(target);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const cutoff = new Date(dayBefore);
    cutoff.setHours(12, 10, 0, 0);

    if (now > cutoff) {
      const cutoffDateLabel = dayBefore.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        allowed: false,
        reason: `The cutoff for ${target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} was 12:10 PM on ${cutoffDateLabel}. It's too late to mark this date.`,
      };
    }

    return { allowed: true, reason: '' };
  }

  async function handleMarkAbsent() {
    if (!selectedDate) {
      setMessage({ type: 'error', text: 'Please select a date.' });
      return;
    }

    const check = canMarkAbsentForDate(selectedDate);
    if (!check.allowed) {
      setMessage({ type: 'error', text: check.reason });
      return;
    }

    // Check if already absent
    if (absences.some((a) => a.absent_date === selectedDate)) {
      setMessage({ type: 'error', text: 'You are already marked absent for this date.' });
      return;
    }

    setMarking(true);
    setMessage(null);

    const { error } = await supabase.from('absences').insert({
      student_id: student.id,
      absent_date: selectedDate,
    });

    if (error) {
      if (error.code === '23505') {
        setMessage({ type: 'error', text: 'You have already marked yourself absent for that date.' });
      } else {
        setMessage({ type: 'error', text: error.message });
      }
    } else {
      const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      setMessage({ type: 'success', text: `You have been marked absent for ${dateLabel}.` });
      setShowMarkAbsent(false);
      setSelectedDate('');
      onAbsenceChange();
    }
    setMarking(false);
  }

  function canRemoveAbsence(absentDate: string): boolean {
    const target = new Date(absentDate + 'T00:00:00');
    target.setHours(0, 0, 0, 0);
    const dayBefore = new Date(target);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const cutoff = new Date(dayBefore);
    cutoff.setHours(12, 10, 0, 0);
    return now <= cutoff;
  }

  async function handleRemoveAbsence(absence: Absence) {
    if (!canRemoveAbsence(absence.absent_date)) {
      setMessage({ type: 'error', text: `The cutoff for this date has passed. You can no longer change your attendance for this date.` });
      return;
    }
    setRemovingId(absence.id);
    const { error } = await supabase.from('absences').delete().eq('id', absence.id);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      const dateLabel = new Date(absence.absent_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      setMessage({ type: 'success', text: `Removed absence for ${dateLabel}. You will be marked present.` });
      onAbsenceChange();
    }
    setRemovingId(null);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20">
        <p className="text-sm text-teal-100">Welcome back,</p>
        <h2 className="text-xl font-bold">{student.full_name}</h2>
        <div className="mt-3 flex items-center gap-4 text-xs text-teal-100">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            {hostel?.name}
          </span>
          {student.room_no && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-200" />
              Room {student.room_no}
            </span>
          )}
        </div>
      </div>

      {/* Today's status */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Today's Status</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          {isAbsentToday ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2">
              <XCircle className="h-5 w-5 text-rose-500" />
              <span className="text-sm font-semibold text-rose-600">Absent</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600">Present</span>
            </div>
          )}
        </div>
      </div>

      {/* Mark Absent */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <CalendarX className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Mark Absent</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Mark yourself absent for any date up to 1 month ahead. Each date must be marked before 12:10 PM on the previous day.
            </p>
          </div>
        </div>

        {!showMarkAbsent ? (
          <button
            onClick={() => {
              setShowMarkAbsent(true);
              setSelectedDate(tomorrowStr);
              setMessage(null);
            }}
            className="btn-danger mt-3 w-full"
          >
            <span className="flex items-center justify-center gap-2">
              <CalendarPlus size={18} /> Mark Absent for a Date
            </span>
          </button>
        ) : (
          <div className="mt-3 space-y-3 animate-scale-in">
            <div>
              <label className="label-text">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                min={tomorrowStr}
                max={maxDateStr}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMessage(null);
                }}
                className="input-field"
              />
              <p className="mt-1 text-xs text-slate-400">
                You can select any date from tomorrow up to 1 month ahead.
              </p>
            </div>

            {selectedDate && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  You are about to mark yourself <span className="font-semibold text-rose-600">absent</span> for{' '}
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  . You will not be charged for that day.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowMarkAbsent(false);
                  setSelectedDate('');
                  setMessage(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAbsent}
                disabled={marking || !selectedDate}
                className="btn-danger flex-1"
              >
                {marking ? 'Marking...' : 'Confirm Absence'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Upcoming absences */}
      {upcomingAbsences.length > 0 && (
        <div className="card">
          <p className="text-sm font-bold text-slate-900 mb-3">Upcoming Absences</p>
          <div className="space-y-2">
            {upcomingAbsences.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-medium text-rose-700">
                    {new Date(a.absent_date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {canRemoveAbsence(a.absent_date) ? (
                  <button
                    onClick={() => handleRemoveAbsence(a)}
                    disabled={removingId === a.id}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {removingId === a.id ? 'Removing...' : 'Remove'}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Locked</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            You can remove an upcoming absence to be marked present again.
          </p>
        </div>
      )}

      {/* Pay Fee */}
      <button onClick={() => onNavigate('fees')} className="card w-full text-left active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <Receipt className="h-6 w-6 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Pay Mess Fee</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {presentDays} days present this month — tap to view your bill
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </div>
      </button>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-medium text-slate-500">Days Present</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {presentDays}
            <span className="text-sm font-normal text-slate-400"> / {daysInMonth}</span>
          </p>
          <p className="text-xs text-slate-400">{getMonthName(month)} {year}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-medium text-slate-500">Days Absent</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {monthAbsences.length}
            <span className="text-sm font-normal text-slate-400"> / {daysInMonth}</span>
          </p>
          <p className="text-xs text-slate-400">{getMonthName(month)} {year}</p>
        </div>
      </div>
    </div>
  );
}
