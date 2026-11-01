import { useState, useEffect } from 'react';
import { Receipt, CheckCircle2, Clock, Info, Utensils, Home, Wallet, BedDouble, ChevronDown, ChevronUp } from 'lucide-react';
import type { Student, Hostel, Absence, Bill } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getDaysInMonth, getMonthName, formatMonthLabel } from '@/lib/utils';
import { LoadingSpinner, EmptyState, ErrorBanner } from '@/components/Feedback';

type StudentFeesProps = {
  student: Student;
  hostel: Hostel;
  absences: Absence[];
};

function BreakdownRow({ icon, label, amount, iconColor }: { icon: React.ReactNode; label: string; amount: number; iconColor: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{formatCurrency(amount)}</span>
    </div>
  );
}

function BillBreakdownCard({ bill, variant }: { bill: Bill; variant: 'current' | 'past' }) {
  const [expanded, setExpanded] = useState(variant === 'current');
  const hasBreakdown = (bill.mess_amount || 0) > 0 || (bill.common_amount || 0) > 0 || (bill.allowance_amount || 0) > 0 || (bill.room_rent_amount || 0) > 0;
  const presentDays = bill.present_days;

  const messPerDay = presentDays > 0 ? (bill.mess_amount || 0) / presentDays : 0;
  const allowancePerDay = presentDays > 0 ? (bill.allowance_amount || 0) / presentDays : 0;

  const cardClass = variant === 'current'
    ? 'rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-5 text-white shadow-lg shadow-teal-600/20'
    : 'card';

  const labelClass = variant === 'current' ? 'text-teal-100' : 'text-slate-500';
  const valueClass = variant === 'current' ? 'text-white' : 'text-slate-900';
  const dividerClass = variant === 'current' ? 'border-white/20' : 'border-slate-100';

  return (
    <div className={`${cardClass} space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm ${labelClass}`}>{formatMonthLabel(bill.month)}</p>
          <p className={`text-2xl font-bold ${valueClass}`}>{formatCurrency(bill.amount)}</p>
          <p className={`mt-0.5 text-xs ${labelClass}`}>{presentDays} days present</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {bill.status === 'paid' ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <span className="text-sm font-semibold text-emerald-200">Paid</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-amber-400/20 px-3 py-2">
              <Clock className="h-5 w-5 text-amber-300" />
              <span className="text-sm font-semibold text-amber-200">Unpaid</span>
            </div>
          )}
          {hasBreakdown && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
      </div>

      {hasBreakdown && expanded && (
        <div className={`space-y-0 border-t ${dividerClass} pt-2`}>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-teal-300"><Utensils size={16} /></span>
              <span className={`text-sm ${variant === 'current' ? 'text-slate-300' : 'text-slate-500'}`}>Mess Bill</span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-semibold ${valueClass}`}>{formatCurrency(bill.mess_amount || 0)}</span>
              {presentDays > 0 && (bill.mess_amount || 0) > 0 && (
                <p className={`text-[11px] ${labelClass}`}>{formatCurrency(messPerDay)}/day x {presentDays} days</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-300"><Home size={16} /></span>
              <span className={`text-sm ${variant === 'current' ? 'text-slate-300' : 'text-slate-500'}`}>Common Bill</span>
            </div>
            <span className={`text-sm font-semibold ${valueClass}`}>{formatCurrency(bill.common_amount || 0)}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-300"><Wallet size={16} /></span>
              <span className={`text-sm ${variant === 'current' ? 'text-slate-300' : 'text-slate-500'}`}>Allowance</span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-semibold ${valueClass}`}>{formatCurrency(bill.allowance_amount || 0)}</span>
              {presentDays > 0 && (bill.allowance_amount || 0) > 0 && (
                <p className={`text-[11px] ${labelClass}`}>{formatCurrency(allowancePerDay)}/day x {presentDays} days</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-violet-300"><BedDouble size={16} /></span>
              <span className={`text-sm ${variant === 'current' ? 'text-slate-300' : 'text-slate-500'}`}>Room Rent</span>
            </div>
            <span className={`text-sm font-semibold ${valueClass}`}>{formatCurrency(bill.room_rent_amount || 0)}</span>
          </div>

          <div className={`flex items-center justify-between border-t ${dividerClass} pt-2`}>
            <span className={`text-sm font-medium ${variant === 'current' ? 'text-teal-100' : 'text-slate-600'}`}>Total</span>
            <span className={`text-base font-bold ${valueClass}`}>{formatCurrency(bill.amount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentFees({ student, absences }: StudentFeesProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBills();
  }, [student]);

  async function loadBills() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('bills')
      .select('*')
      .eq('student_id', student.id)
      .order('month', { ascending: false });

    if (err) setError(err.message);
    else setBills(data || []);
    setLoading(false);
  }

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = getDaysInMonth(year, month);
  const monthAbsences = absences.filter((a) => {
    const d = new Date(a.absent_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const presentDays = daysInMonth - monthAbsences.length;
  const monthFirstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const currentBill = bills.find((b) => b.month === monthFirstStr);
  const hasCurrentBill = !!currentBill;
  const pastBills = bills.filter((b) => b.month !== monthFirstStr);

  if (loading) return <LoadingSpinner message="Loading your bills..." />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Mess Bills</h2>

      {error && <ErrorBanner message={error} />}

      {hasCurrentBill ? (
        <BillBreakdownCard bill={currentBill!} variant="current" />
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-5 text-white shadow-lg">
          <p className="text-sm text-slate-300">{getMonthName(month)} {year} — Pending</p>
          <p className="mt-2 text-2xl font-bold">{presentDays} days present</p>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2.5">
            <Info className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              Your bill will be generated by the warden. The amount is calculated as: total mess expense ÷ total present days of all students × your present days.
            </p>
          </div>
        </div>
      )}

      {pastBills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No past bills"
          description="Your previous month bills will appear here."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Bill History</p>
          {pastBills.map((bill) => (
            <BillBreakdownCard key={bill.id} bill={bill} variant="past" />
          ))}
        </div>
      )}
    </div>
  );
}
