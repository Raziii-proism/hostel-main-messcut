import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import type { ExpenseItem } from '@/lib/supabase';
import { formatCurrency, formatMonthLabel } from '@/lib/utils';
import { EmptyState } from '@/components/Feedback';

type WardenAnalyticsProps = {
  expenseItems: ExpenseItem[];
};

type MonthData = {
  month: string;
  commonBill: number;
  messBill: number;
  total: number;
};

const MESS_COLOR = '#0d9488';
const COMMON_COLOR = '#3b82f6';

function getPiePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function PieChart({ messAmount, commonAmount }: { messAmount: number; commonAmount: number }) {
  const total = messAmount + commonAmount;
  if (total === 0) return null;

  const messPct = total > 0 ? (messAmount / total) * 100 : 0;
  const commonPct = total > 0 ? (commonAmount / total) * 100 : 0;
  const messAngle = (messPct / 100) * 360;
  const commonAngle = (commonPct / 100) * 360;

  const radius = 52;
  const cx = 60;
  const cy = 60;
  const donutInner = 28;

  const messPath = getPiePath(cx, cy, radius, 0, messAngle);
  const commonPath = getPiePath(cx, cy, radius, messAngle, messAngle + commonAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        <path d={messPath} fill={MESS_COLOR} />
        <path d={commonPath} fill={COMMON_COLOR} />
        <circle cx={cx} cy={cy} r={donutInner} fill="white" />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-slate-900"
          style={{ fontSize: '14px', fontWeight: 700 }}
        >
          {formatCurrency(total).replace('Rs ', '')}
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: '9px', fontWeight: 500 }}
        >
          Total
        </text>
      </svg>
      <div className="mt-3 flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: MESS_COLOR }} />
            <span className="text-slate-600">Mess</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-900">{formatCurrency(messAmount)}</span>
            <span className="text-xs text-slate-400 ml-1.5">{messPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COMMON_COLOR }} />
            <span className="text-slate-600">Common</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-900">{formatCurrency(commonAmount)}</span>
            <span className="text-xs text-slate-400 ml-1.5">{commonPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WardenAnalytics({ expenseItems }: WardenAnalyticsProps) {
  const monthsMap = new Map<string, MonthData>();

  for (const item of expenseItems) {
    const monthKey = item.month;
    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, {
        month: monthKey,
        commonBill: 0,
        messBill: 0,
        total: 0,
      });
    }
    const data = monthsMap.get(monthKey)!;
    if (item.type === 'common_bill') {
      data.commonBill += item.amount;
    } else if (item.type === 'mess_bill') {
      data.messBill += item.amount;
    }
    data.total = data.commonBill + data.messBill;
  }

  const months = Array.from(monthsMap.values()).sort((a, b) => b.month.localeCompare(a.month));

  const totalMess = months.reduce((sum, m) => sum + m.messBill, 0);
  const totalCommon = months.reduce((sum, m) => sum + m.commonBill, 0);
  const grandTotal = totalMess + totalCommon;

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Analytics</h2>

      {months.length === 0 ? (
        <EmptyState
          icon={PieChartIcon}
          title="No data yet"
          description="Add mess bill and common bill expense items to see monthly analytics."
        />
      ) : (
        <>
          {/* Overall summary */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-teal-300" />
              <p className="text-sm font-medium text-slate-300">Overall Comparison</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: MESS_COLOR }} />
                  <span className="text-sm text-slate-400">Total Mess Bill</span>
                </div>
                <span className="text-sm font-bold text-teal-300">{formatCurrency(totalMess)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COMMON_COLOR }} />
                  <span className="text-sm text-slate-400">Total Common Bill</span>
                </div>
                <span className="text-sm font-bold text-blue-300">{formatCurrency(totalCommon)}</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                <span className="text-sm text-slate-300 font-medium">Grand Total</span>
                <span className="text-lg font-bold">{formatCurrency(grandTotal)}</span>
              </div>
              {grandTotal > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${(totalMess / grandTotal) * 100}%`, backgroundColor: MESS_COLOR }} />
                  <div style={{ width: `${(totalCommon / grandTotal) * 100}%`, backgroundColor: COMMON_COLOR }} />
                </div>
              )}
            </div>
          </div>

          {/* Per-month pie charts */}
          <p className="text-sm font-semibold text-slate-700">Monthly Breakdown</p>
          {months.map((m) => (
            <div key={m.month} className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-900">{formatMonthLabel(m.month)}</p>
                <span className="text-xs font-medium text-slate-400">
                  {m.messBill + m.commonBill > 0
                    ? `${((m.messBill / (m.messBill + m.commonBill)) * 100).toFixed(0)}% mess`
                    : ''}
                </span>
              </div>
              <PieChart messAmount={m.messBill} commonAmount={m.commonBill} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
