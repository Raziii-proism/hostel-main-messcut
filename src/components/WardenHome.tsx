import { useState } from 'react';
import { Calculator, UserPlus, Users, ChevronRight, CalendarCheck, Clock, CalendarOff, Trash2, Loader2, UserCheck, Plus, Pencil } from 'lucide-react';
import type { Hostel, Absence, MessLeave, ExpenseItem, ExpenseItemType } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getDaysInMonth, getMonthName, formatDate } from '@/lib/utils';
import { ErrorBanner } from '@/components/Feedback';

type WardenHomeProps = {
  hostel: Hostel;
  studentCount: number;
  absences: Absence[];
  messLeaves: MessLeave[];
  expenseItems: ExpenseItem[];
  onSettings: () => void;
  onStudents: () => void;
  onDataChange: () => void;
};

const EXPENSE_TYPES: { value: ExpenseItemType; label: string; color: string }[] = [
  { value: 'common_bill', label: 'Common Bill', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'mess_bill', label: 'Mess Bill', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'allowance', label: 'Allowance', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { value: 'room_rent', label: 'Room Rent', color: 'bg-violet-50 text-violet-600 border-violet-200' },
];

function typeLabel(type: ExpenseItemType): string {
  return EXPENSE_TYPES.find((t) => t.value === type)?.label || type;
}

function typeColor(type: ExpenseItemType): string {
  return EXPENSE_TYPES.find((t) => t.value === type)?.color || 'bg-slate-50 text-slate-600 border-slate-200';
}

export function WardenHome({ hostel, studentCount, absences, messLeaves, expenseItems, onStudents, onDataChange }: WardenHomeProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expenseLabel, setExpenseLabel] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseItemType>('mess_bill');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [removingExpenseId, setRemovingExpenseId] = useState<string | null>(null);
  const [selectedMonthStr, setSelectedMonthStr] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const [showLeave, setShowLeave] = useState(false);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [removingLeaveId, setRemovingLeaveId] = useState<string | null>(null);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = getDaysInMonth(year, month);

  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const totalAbsentDays = monthAbsences.length;

  const todayStr = formatDate(now);
  const todayAbsences = monthAbsences.filter((a) => a.absent_date === todayStr);
  const todayMessLeave = messLeaves.some((ml) => {
    const start = new Date(ml.start_date + 'T00:00:00');
    const end = new Date(ml.end_date + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    return today >= start && today <= end;
  });
  const studentsPresentToday = todayMessLeave ? 0 : studentCount - todayAbsences.length;

  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    const start = new Date(ml.start_date + 'T00:00:00');
    const end = new Date(ml.end_date + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      messLeaveDates.add(formatDate(new Date(d)));
    }
  }
  const monthMessLeaveDays = Array.from(messLeaveDates).filter((d) => {
    const dt = new Date(d + 'T00:00:00');
    return dt.getMonth() === month && dt.getFullYear() === year;
  }).length;

  const totalPossibleDays = studentCount * daysInMonth;
  const totalPresentDays = totalPossibleDays - totalAbsentDays - monthMessLeaveDays * studentCount;

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
  const canEditPreviousMonth = now.getDate() <= 5;
  const currentMonthExpenses = expenseItems.filter((item) => item.month === selectedMonthStr);
  const [selYear, selMonthNum] = selectedMonthStr.split('-').map(Number);
  const selMonthLabel = `${getMonthName(selMonthNum - 1)} ${selYear}`;

  const expenseByType = currentMonthExpenses.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.amount;
    return acc;
  }, {} as Record<ExpenseItemType, number>);

  const commonBillTotal = expenseByType.common_bill || 0;
  const messBillTotal = expenseByType.mess_bill || 0;
  const allowanceTotal = expenseByType.allowance || 0;
  const roomRentTotal = expenseByType.room_rent || 0;

  const totalExpenseNum = commonBillTotal + messBillTotal + allowanceTotal + roomRentTotal;
  const messPerDayCost = totalPresentDays > 0 ? messBillTotal / totalPresentDays : 0;


  function openAddExpense() {
    setEditingExpense(null);
    setExpenseLabel('');
    setExpenseType('mess_bill');
    setExpenseAmount('');
    setExpenseError(null);
    setShowExpenseForm(true);
  }

  function openEditExpense(item: ExpenseItem) {
    setEditingExpense(item);
    setExpenseLabel(item.label);
    setExpenseType(item.type);
    setExpenseAmount(String(item.amount));
    setExpenseError(null);
    setShowExpenseForm(true);
  }

  async function handleSaveExpense() {
    const amountNum = parseFloat(expenseAmount);
    if (!expenseLabel.trim()) {
      setExpenseError('Please enter a label for this expense.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpenseError('Please enter a valid amount.');
      return;
    }
    setExpenseSaving(true);
    setExpenseError(null);
    if (editingExpense) {
      const { error: err } = await supabase
        .from('expense_items')
        .update({ label: expenseLabel.trim(), type: expenseType, amount: amountNum })
        .eq('id', editingExpense.id);
      if (err) {
        setExpenseError(err.message);
      } else {
        setSuccess('Expense item updated.');
        onDataChange();
        setTimeout(() => setSuccess(null), 3000);
        setShowExpenseForm(false);
      }
    } else {
      const { error: err } = await supabase.from('expense_items').insert({
        hostel_id: hostel.id,
        label: expenseLabel.trim(),
        type: expenseType,
        amount: amountNum,
        month: selectedMonthStr,
      });
      if (err) {
        setExpenseError(err.message);
      } else {
        setSuccess('Expense item added.');
        onDataChange();
        setTimeout(() => setSuccess(null), 3000);
        setShowExpenseForm(false);
      }
    }
    setExpenseSaving(false);
  }

  async function handleRemoveExpense(item: ExpenseItem) {
    setRemovingExpenseId(item.id);
    const { error: err } = await supabase.from('expense_items').delete().eq('id', item.id);
    if (err) {
      setError(err.message);
    } else {
      setSuccess('Expense item removed.');
      onDataChange();
      setTimeout(() => setSuccess(null), 3000);
    }
    setRemovingExpenseId(null);
  }

  async function handleSaveLeave() {
    if (!leaveStart || !leaveEnd) {
      setLeaveError('Please select both start and end dates.');
      return;
    }
    if (leaveEnd < leaveStart) {
      setLeaveError('End date must be on or after the start date.');
      return;
    }
    setLeaveSaving(true);
    setLeaveError(null);
    const { error: err } = await supabase.from('mess_leaves').insert({
      hostel_id: hostel.id,
      start_date: leaveStart,
      end_date: leaveEnd,
      reason: leaveReason || null,
    });
    if (err) {
      setLeaveError(err.message);
    } else {
      setSuccess('Mess leave declared for the selected period.');
      onDataChange();
      setTimeout(() => setSuccess(null), 3000);
      setShowLeave(false);
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
    }
    setLeaveSaving(false);
  }

  async function handleRemoveLeave(leave: MessLeave) {
    setRemovingLeaveId(leave.id);
    const { error: err } = await supabase.from('mess_leaves').delete().eq('id', leave.id);
    if (err) {
      setError(err.message);
    } else {
      setSuccess('Mess leave cancelled.');
      onDataChange();
      setTimeout(() => setSuccess(null), 3000);
    }
    setRemovingLeaveId(null);
  }


  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats card */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-4 text-white shadow-lg shadow-teal-600/20">
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="h-5 w-5 text-teal-100" />
          <p className="text-xs text-teal-100">Students Present Today</p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold">{studentsPresentToday}</p>
          <p className="text-sm text-teal-100">/ {studentCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-4 text-white shadow-lg shadow-teal-600/20">
          <Users className="h-5 w-5 text-teal-100 mb-2" />
          <p className="text-2xl font-bold">{studentCount}</p>
          <p className="text-xs text-teal-100">Students</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
          <CalendarCheck className="h-5 w-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{totalPresentDays}</p>
          <p className="text-xs text-slate-500">Total presents ({getMonthName(month)})</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </div>
      )}

      {/* Monthly Expense Items */}
      <div className="card">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Calculator className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Monthly Expense Items — {selMonthLabel}</p>
            <p className="text-xs text-slate-500">
              Mess bill and allowance are split by present days, common bill and room rent by number of students. Allowance is added directly to each student's bill.
            </p>
          </div>
        </div>

        {canEditPreviousMonth && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedMonthStr(prevMonthStr)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                selectedMonthStr === prevMonthStr
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {getMonthName(prevMonth)} {prevYear}
            </button>
            <button
              onClick={() => setSelectedMonthStr(currentMonthStr)}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                selectedMonthStr === currentMonthStr
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {getMonthName(month)} {year} (Current)
            </button>
          </div>
        )}

        {currentMonthExpenses.length > 0 && (
          <div className="mb-3 space-y-2">
            {currentMonthExpenses.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${typeColor(item.type)}`}>
                      {typeLabel(item.type)}
                    </span>
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.label}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(item.amount)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => openEditExpense(item)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveExpense(item)}
                    disabled={removingExpenseId === item.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                  >
                    {removingExpenseId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalExpenseNum > 0 && studentCount > 0 && (
          <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-sm space-y-1">
            {messBillTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Mess bill (per day)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Math.round(messPerDayCost))}</span>
              </div>
            )}
            {commonBillTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Common bill (per student)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Math.round(commonBillTotal / studentCount))}</span>
              </div>
            )}
            {allowanceTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Allowance (per day)</span>
                <span className="font-semibold text-amber-600">{formatCurrency(Math.round(allowanceTotal / (totalPresentDays || 1)))}</span>
              </div>
            )}
            {roomRentTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Room rent (per student)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Math.round(roomRentTotal))}</span>
              </div>
            )}
            <div className="border-t border-slate-200 mt-1 pt-1 flex justify-between">
              <span className="font-medium text-slate-700">Total expense</span>
              <span className="font-bold text-slate-900">{formatCurrency(totalExpenseNum)}</span>
            </div>
          </div>
        )}

        {!showExpenseForm ? (
          <button onClick={openAddExpense} className="btn-primary w-full">
            <span className="flex items-center justify-center gap-2">
              <Plus size={18} /> Add Expense Item
            </span>
          </button>
        ) : (
          <div className="space-y-3 animate-scale-in">
            <div>
              <label className="label-text">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setExpenseType(t.value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      expenseType === t.value
                        ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-text">Label</label>
              <input
                type="text"
                value={expenseLabel}
                onChange={(e) => { setExpenseLabel(e.target.value); setExpenseError(null); }}
                placeholder="e.g. September Mess, Electricity, Room 301"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Amount (Rs)</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => { setExpenseAmount(e.target.value); setExpenseError(null); }}
                placeholder="e.g. 50000"
                className="input-field"
              />
            </div>
            {expenseError && <ErrorBanner message={expenseError} />}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowExpenseForm(false); setEditingExpense(null); setExpenseLabel(''); setExpenseAmount(''); setExpenseError(null); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExpense}
                disabled={expenseSaving}
                className="btn-primary flex-1"
              >
                {expenseSaving ? 'Saving...' : editingExpense ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mess Leave section */}
      <div className="card">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
            <CalendarOff className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Mess Leave</p>
            <p className="text-xs text-slate-500">
              Declare a mess closed period. All students will be marked absent for every day in the range.
            </p>
          </div>
        </div>

        {messLeaves.length > 0 && (
          <div className="mb-3 space-y-2">
            {messLeaves.map((ml) => (
              <div key={ml.id} className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-rose-700">
                    {new Date(ml.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' — '}
                    {new Date(ml.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  {ml.reason && <p className="text-xs text-rose-500 mt-0.5">{ml.reason}</p>}
                </div>
                <button
                  onClick={() => handleRemoveLeave(ml)}
                  disabled={removingLeaveId === ml.id}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                >
                  {removingLeaveId === ml.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {removingLeaveId === ml.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}

        {monthMessLeaveDays > 0 && (
          <div className="mb-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">{monthMessLeaveDays}</span> mess leave day{monthMessLeaveDays > 1 ? 's' : ''} in {getMonthName(month)} {year}. These are excluded from all students' present days.
            </p>
          </div>
        )}

        {!showLeave ? (
          <button onClick={() => setShowLeave(true)} className="btn-danger w-full">
            <span className="flex items-center justify-center gap-2">
              <CalendarOff size={18} /> Declare Mess Leave
            </span>
          </button>
        ) : (
          <div className="space-y-3 animate-scale-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Start Date</label>
                <input
                  type="date"
                  value={leaveStart}
                  onChange={(e) => { setLeaveStart(e.target.value); setLeaveError(null); }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">End Date</label>
                <input
                  type="date"
                  value={leaveEnd}
                  min={leaveStart}
                  onChange={(e) => { setLeaveEnd(e.target.value); setLeaveError(null); }}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="label-text">Reason (optional)</label>
              <input
                type="text"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g. Festival, maintenance..."
                className="input-field"
              />
            </div>
            {leaveError && <ErrorBanner message={leaveError} />}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowLeave(false); setLeaveStart(''); setLeaveEnd(''); setLeaveReason(''); setLeaveError(null); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLeave}
                disabled={leaveSaving || !leaveStart || !leaveEnd}
                className="btn-danger flex-1"
              >
                {leaveSaving ? 'Saving...' : 'Declare Leave'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance cutoff info (fixed) */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <Clock className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Attendance Cutoff</p>
            <p className="text-xs text-slate-500">
              Fixed at <span className="font-semibold text-slate-700">12:10 PM</span>. Students must mark absence before 12:10 PM on the previous day.
            </p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <button onClick={onStudents} className="card w-full text-left active:scale-[0.99] transition-transform">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <UserPlus className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Add & View Students</p>
            <p className="text-xs text-slate-500">Manage student accounts</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-300" />
        </div>
      </button>
    </div>
  );
}
