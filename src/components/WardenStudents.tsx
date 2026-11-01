import { useState } from 'react';
import { UserPlus, User, Mail, Trash2, X, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import type { Student, Hostel, Absence, MessLeave } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorBanner } from '@/components/Feedback';
import { getDaysInMonth, getMonthName, formatCurrency, todayString, dateRange } from '@/lib/utils';

type WardenStudentsProps = {
  students: Student[];
  absences: Absence[];
  messLeaves: MessLeave[];
  hostel: Hostel;
  onDataChange: () => void;
};

export function WardenStudents({ students, absences, messLeaves, hostel, onDataChange }: WardenStudentsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    for (const d of dateRange(ml.start_date, ml.end_date)) {
      messLeaveDates.add(d);
    }
  }
  const now = new Date();
  const monthMessLeaveDays = Array.from(messLeaveDates).filter((d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Students</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <UserPlus size={16} /> Add Student
        </button>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={User}
          title="No students yet"
          description="Add your first student to get started with mess management."
        />
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const now = new Date();
            const studentAbsences = absences.filter((a) => {
              const d = new Date(a.absent_date);
              return (
                a.student_id === student.id &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            });
            const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
            const presentDays = daysInMonth - studentAbsences.length - monthMessLeaveDays;

            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="card w-full text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <User className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{student.full_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {student.room_no && <span>Room {student.room_no}</span>}
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        {presentDays} present
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle size={12} className="text-rose-400" />
                        {studentAbsences.length + monthMessLeaveDays} absent
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          hostel={hostel}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            onDataChange();
          }}
        />
      )}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          absences={absences.filter((a) => a.student_id === selectedStudent.id)}
          messLeaveDates={messLeaveDates}
          hostel={hostel}
          onClose={() => setSelectedStudent(null)}
          onDataChange={onDataChange}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  hostel,
  onClose,
  onSuccess,
}: {
  hostel: Hostel;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          hostelId: hostel.id,
          wardenUserId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create student');
      }

      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Add Student</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-text">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Student name"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
              className="input-field"
              required
              minLength={6}
            />
          </div>
          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating...
              </>
            ) : (
              'Create Student Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function StudentDetailModal({
  student,
  absences,
  messLeaveDates,
  hostel,
  onClose,
  onDataChange,
}: {
  student: Student;
  absences: Absence[];
  messLeaveDates: Set<string>;
  hostel: Hostel;
  onClose: () => void;
  onDataChange: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  async function handleDelete() {
    if (!confirm(`Remove ${student.full_name}? This will delete their account.`)) return;
    setDeleting(true);

    const { error } = await supabase.from('students').delete().eq('id', student.id);

    if (error) {
      alert(error.message);
    } else {
      onDataChange();
      onClose();
    }
    setDeleting(false);
  }

  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date);
    return d.getMonth() === calMonth && d.getFullYear() === calYear;
  });
  const monthMessLeaveDays = Array.from(messLeaveDates).filter((d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.getMonth() === calMonth && dt.getFullYear() === calYear;
  }).length;
  const absenceDates = new Set(monthAbsences.map((a) => a.absent_date));
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const presentDays = daysInMonth - monthAbsences.length - monthMessLeaveDays;
  const estimatedBill = presentDays * (hostel.daily_cost || 0);
  const today = todayString();

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Student Details</h3>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
            <User className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{student.full_name}</p>
            <p className="text-xs text-slate-500">{hostel.name}</p>
          </div>
        </div>

        <div className="space-y-3">
          <DetailRow icon={Mail} label="Email" value={student.id} />
        </div>

        {/* Attendance Calendar */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <p className="text-sm font-bold text-slate-900">
              {getMonthName(calMonth)} {calYear}
            </p>
            <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100">
              <ChevronRight size={18} className="text-slate-600" />
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
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isAbsent = absenceDates.has(dateStr) || messLeaveDates.has(dateStr);
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

          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
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

        {/* Summary */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500 mb-2">
            {getMonthName(calMonth)} {calYear} Summary
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Days present</span>
              <span className="font-semibold text-slate-900">{presentDays} / {daysInMonth}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Days absent</span>
              <span className="font-semibold text-rose-500">{monthAbsences.length + monthMessLeaveDays}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="font-medium text-slate-700">Estimated bill</span>
              <span className="font-bold text-teal-600">{formatCurrency(estimatedBill)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn-secondary mt-4 w-full text-rose-600 hover:bg-rose-50 border-rose-200"
        >
          <Trash2 size={16} /> Remove Student
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{value}</span>
    </div>
  );
}
