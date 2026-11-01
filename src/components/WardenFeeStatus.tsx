import { useState } from 'react';
import { Receipt, CheckCircle2, Clock, Users, AlertCircle, Loader2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Student, Hostel, Bill, Absence, MessLeave, ExpenseItem, ExpenseItemType } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getDaysInMonth, getMonthName, formatMonthLabel, dateRange } from '@/lib/utils';
import { EmptyState, ErrorBanner } from '@/components/Feedback';

type WardenFeeStatusProps = {
  students: Student[];
  bills: Bill[];
  absences: Absence[];
  messLeaves: MessLeave[];
  hostel: Hostel;
  expenseItems: ExpenseItem[];
  onDataChange: () => void;
};

export function WardenFeeStatus({ students, bills, absences, messLeaves, hostel, expenseItems, onDataChange }: WardenFeeStatusProps) {
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [updatingBillId, setUpdatingBillId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [includePrevDay, setIncludePrevDay] = useState(false);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const isCurrentMonth = viewMonth === now.getMonth() && viewYear === now.getFullYear();
  const isPreviousMonth =
    (viewYear === now.getFullYear() && viewMonth === now.getMonth() - 1) ||
    (now.getMonth() === 0 && viewMonth === 11 && viewYear === now.getFullYear() - 1);
  const canGeneratePreviousMonth = now.getDate() <= 5;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const month = viewMonth;
  const year = viewYear;
  const monthFirstStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const daysInMonth = getDaysInMonth(year, month);
  const billingDays = includePrevDay ? daysInMonth + 1 : daysInMonth;
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const billingStart = includePrevDay
    ? (() => { const prev = new Date(year, month, 0); return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`; })()
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const monthAbsences = absences.filter((a) => {
    return a.absent_date >= billingStart && a.absent_date <= monthEndStr;
  });
  const messLeaveDates = new Set<string>();
  for (const ml of messLeaves) {
    for (const d of dateRange(ml.start_date, ml.end_date)) {
      if (d >= billingStart && d <= monthEndStr) {
        messLeaveDates.add(d);
      }
    }
  }
  const messLeaveDayCount = messLeaveDates.size;
  const totalPresentDays = students.length * billingDays - monthAbsences.length - messLeaveDayCount * students.length;
  const monthExpenseItems = expenseItems.filter((item) => item.month === monthFirstStr);
  const expenseByType = monthExpenseItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.amount;
    return acc;
  }, {} as Record<ExpenseItemType, number>);

  const commonBillTotal = expenseByType.common_bill || 0;
  const messBillTotal = expenseByType.mess_bill || 0;
  const allowanceTotal = expenseByType.allowance || 0;
  const roomRentTotal = expenseByType.room_rent || 0;

  const studentCount = students.length;
  const commonBillPerStudent = studentCount > 0 ? commonBillTotal / studentCount : 0;
  const messPerDayCost = totalPresentDays > 0 ? messBillTotal / totalPresentDays : 0;
  const allowancePerDay = totalPresentDays > 0 ? allowanceTotal / totalPresentDays : 0;
  const roomRentPerStudent = roomRentTotal;

  const totalExpense = commonBillTotal + messBillTotal + allowanceTotal + roomRentTotal;

  const currentMonthBills = bills.filter((b) => b.month === monthFirstStr);

  const studentFeeStatus = students.map((student) => {
    const studentAbsences = monthAbsences.filter((a) => a.student_id === student.id).length;
    const presentDays = billingDays - studentAbsences - messLeaveDayCount;
    const messPortion = Math.round(messPerDayCost * presentDays * 100) / 100;
    const commonPortion = Math.round(commonBillPerStudent * 100) / 100;
    const allowancePortion = Math.round(allowancePerDay * presentDays * 100) / 100;
    const roomPortion = Math.round(roomRentPerStudent * 100) / 100;
    const amount = Math.max(0, Math.round((messPortion + commonPortion + allowancePortion + roomPortion) * 100) / 100);
    const bill = currentMonthBills.find((b) => b.student_id === student.id);
    return {
      student,
      presentDays,
      absentDays: studentAbsences + messLeaveDayCount,
      messPortion,
      commonPortion,
      allowancePortion,
      roomPortion,
      amount: bill ? bill.amount : amount,
      status: bill?.status || 'unpaid',
      hasBill: !!bill,
    };
  });

  const totalCollected = currentMonthBills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);
  const totalPending = studentFeeStatus
    .filter((s) => s.status === 'unpaid')
    .reduce((sum, s) => sum + s.amount, 0);


  const billsByMonth: Record<string, Bill[]> = {};
  bills.forEach((b) => {
    if (b.month !== monthFirstStr) {
      if (!billsByMonth[b.month]) billsByMonth[b.month] = [];
      billsByMonth[b.month].push(b);
    }
  });

  // For past months, the PDF should show saved bills for that month
  const viewedMonthBills = bills.filter((b) => b.month === monthFirstStr);
  const viewedMonthExpenses = expenseItems.filter((item) => item.month === monthFirstStr);

  async function handleGenerateBills() {
    setGenerating(true);
    setGenResult(null);
    setError(null);
    const { data, error: err } = await supabase.rpc('generate_monthly_bills', {
      p_hostel_id: hostel.id,
      p_month: monthFirstStr,
      p_include_prev_day: includePrevDay,
    });
    if (err) {
      setError(err.message);
    } else if (data?.error) {
      setError(data.error);
    } else {
      const inserted = data?.bills_inserted ?? 0;
      setGenResult(`Bills generated for ${inserted} student${inserted !== 1 ? 's' : ''}.`);
      onDataChange();
      setTimeout(() => setGenResult(null), 5000);
    }
    setGenerating(false);
  }

  async function toggleBillStatus(billId: string, currentStatus: string) {
    setUpdatingBillId(billId);
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const { error: err } = await supabase
      .from('bills')
      .update({ status: newStatus })
      .eq('id', billId);
    if (err) {
      setError(err.message);
    } else {
      onDataChange();
    }
    setUpdatingBillId(null);
  }

  async function generateBillPDF(
    monthLabel: string,
    studentRows: Array<{
      name: string;
      presentDays: number;
      amount: number;
      status: string;
      mess?: number;
      common?: number;
      allowance?: number;
      room?: number;
    }>,
    totals: { expense: number; collected: number; pending: number },
    expenseBreakdown?: { mess: number; common: number; allowance: number; room: number },
  ) {
    const [{ default: jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const autoTable = autoTableModule.default;
    const hasBreakdown = !!expenseBreakdown;
    const fmtPDF = (n: number) => {
      const formatted = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
      return 'Rs. ' + formatted;
    };
    const doc = new jsPDF({ orientation: hasBreakdown ? 'landscape' : 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136);
    doc.text(hostel.name, 14, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Monthly Bill Report — ${monthLabel}`, 14, 30);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      pageWidth - 14,
      22,
      { align: 'right' },
    );
    doc.text(`Students: ${studentRows.length}`, pageWidth - 14, 28, { align: 'right' });

    // Divider line
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.8);
    doc.line(14, 35, pageWidth - 14, 35);

    // Summary boxes
    const boxY = 42;
    const boxH = 22;
    const boxCount = hasBreakdown ? 4 : 3;
    const boxW = (pageWidth - 28 - (boxCount - 1) * 4) / boxCount;
    const labels = hasBreakdown
      ? [
          { label: 'Mess Bill', value: fmtPDF(expenseBreakdown!.mess), color: [13, 148, 136] as [number, number, number] },
          { label: 'Common Bill', value: fmtPDF(expenseBreakdown!.common), color: [59, 130, 246] as [number, number, number] },
          { label: 'Allowance', value: fmtPDF(expenseBreakdown!.allowance), color: [217, 119, 6] as [number, number, number] },
          { label: 'Room Rent', value: fmtPDF(expenseBreakdown!.room), color: [139, 92, 246] as [number, number, number] },
        ]
      : [
          { label: 'Total Expense', value: fmtPDF(totals.expense), color: [13, 148, 136] as [number, number, number] },
          { label: 'Collected', value: fmtPDF(totals.collected), color: [5, 150, 105] as [number, number, number] },
          { label: 'Pending', value: fmtPDF(totals.pending), color: [217, 119, 6] as [number, number, number] },
        ];
    labels.forEach((item, i) => {
      const x = 14 + i * (boxW + 4);
      doc.setFillColor(245, 250, 249);
      doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(item.label.toUpperCase(), x + 5, boxY + 8);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...item.color);
      doc.text(item.value, x + 5, boxY + 17);
    });

    let afterBoxesY = boxY + boxH + 8;

    // Expense breakdown summary table (when breakdown available)
    if (hasBreakdown) {
      autoTable(doc, {
        startY: afterBoxesY,
        head: [['Mess Bill', 'Common Bill', 'Allowance', 'Room Rent', 'Total'] ],
        body: [[
          fmtPDF(expenseBreakdown!.mess),
          fmtPDF(expenseBreakdown!.common),
          fmtPDF(expenseBreakdown!.allowance),
          fmtPDF(expenseBreakdown!.room),
          fmtPDF(totals.expense),
        ]],
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [100, 116, 139],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 11,
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          halign: 'right',
        },
        columnStyles: {
          4: { textColor: [13, 148, 136] },
        },
        margin: { left: 14, right: 14 },
      });
      afterBoxesY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }

    // Student bills table
    const head = hasBreakdown
      ? ['#', 'Student Name', 'Days', 'Mess', 'Common', 'Allowance', 'Room', 'Total', 'Status']
      : ['#', 'Student Name', 'Present Days', 'Amount', 'Status'];
    const body = studentRows.map((s, i) =>
      hasBreakdown
        ? [
            String(i + 1),
            s.name,
            String(s.presentDays),
            fmtPDF(s.mess || 0),
            fmtPDF(s.common || 0),
            fmtPDF(s.allowance || 0),
            fmtPDF(s.room || 0),
            fmtPDF(s.amount),
            s.status === 'paid' ? 'Paid' : 'Unpaid',
          ]
        : [
            String(i + 1),
            s.name,
            String(s.presentDays),
            fmtPDF(s.amount),
            s.status === 'paid' ? 'Paid' : 'Unpaid',
          ],
    );
    const statusCol = hasBreakdown ? 8 : 4;
    autoTable(doc, {
      startY: afterBoxesY,
      head: [head],
      body,
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [100, 116, 139],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 41, 59],
      },
      columnStyles: hasBreakdown
        ? {
            0: { cellWidth: 10, halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right', fontStyle: 'bold' },
            8: { halign: 'center' },
          }
        : {
            0: { cellWidth: 12, halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'center' },
          },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === statusCol) {
          const status = studentRows[data.row.index]?.status;
          if (status === 'paid') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by Hostel Mess Cut on ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      pageWidth / 2,
      finalY + 14,
      { align: 'center' },
    );

    const fileName = `${hostel.name.replace(/[^a-zA-Z0-9]/g, '_')}_${monthLabel.replace(/\s+/g, '_')}_Bills.pdf`;
    doc.save(fileName);
  }

  async function handleDownloadPDF() {
    setDownloading(true);
    const monthLabel = `${getMonthName(month)} ${year}`;
    const pdfStudents = isCurrentMonth
      ? studentFeeStatus.map((s) => ({
          name: s.student.full_name,
          presentDays: s.presentDays,
          amount: s.amount,
          status: s.status,
          mess: s.messPortion,
          common: s.commonPortion,
          allowance: s.allowancePortion,
          room: s.roomPortion,
        }))
      : viewedMonthBills.map((bill) => {
          const student = students.find((s) => s.id === bill.student_id);
          return {
            name: student?.full_name || 'Unknown',
            presentDays: bill.present_days,
            amount: bill.amount,
            status: bill.status,
            mess: bill.mess_amount || 0,
            common: bill.common_amount || 0,
            allowance: bill.allowance_amount || 0,
            room: bill.room_rent_amount || 0,
          };
        });

    const pdfTotalExpense = isCurrentMonth ? totalExpense : viewedMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pdfTotalCollected = viewedMonthBills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
    const pdfTotalPending = viewedMonthBills.filter((b) => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0);

    const breakdown = isCurrentMonth
      ? { mess: messBillTotal, common: commonBillTotal, allowance: allowanceTotal, room: roomRentTotal }
      : viewedMonthBills.length > 0
      ? {
          mess: viewedMonthBills.reduce((sum, b) => sum + (b.mess_amount || 0), 0),
          common: viewedMonthBills.reduce((sum, b) => sum + (b.common_amount || 0), 0),
          allowance: viewedMonthBills.reduce((sum, b) => sum + (b.allowance_amount || 0), 0),
          room: viewedMonthBills.reduce((sum, b) => sum + (b.room_rent_amount || 0), 0),
        }
      : undefined;

    await generateBillPDF(monthLabel, pdfStudents, {
      expense: pdfTotalExpense,
      collected: pdfTotalCollected,
      pending: pdfTotalPending,
    }, breakdown);
    setDownloading(false);
  }

  async function handleDownloadPDFForMonth(monthKey: string) {
    setDownloading(true);
    const [yStr, mStr] = monthKey.split('-');
    const y = parseInt(yStr);
    const m = parseInt(mStr) - 1;
    const monthLabel = `${getMonthName(m)} ${y}`;
    const monthBills = bills.filter((b) => b.month === monthKey);

    const pdfStudents = monthBills.map((bill) => {
      const student = students.find((s) => s.id === bill.student_id);
      return {
        name: student?.full_name || 'Unknown',
        presentDays: bill.present_days,
        amount: bill.amount,
        status: bill.status,
        mess: bill.mess_amount || 0,
        common: bill.common_amount || 0,
        allowance: bill.allowance_amount || 0,
        room: bill.room_rent_amount || 0,
      };
    });

    const mTotalExpense = monthBills.reduce((sum, b) => sum + b.amount, 0);
    const mTotalCollected = monthBills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
    const mTotalPending = monthBills.filter((b) => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0);

    const breakdown = monthBills.length > 0
      ? {
          mess: monthBills.reduce((sum, b) => sum + (b.mess_amount || 0), 0),
          common: monthBills.reduce((sum, b) => sum + (b.common_amount || 0), 0),
          allowance: monthBills.reduce((sum, b) => sum + (b.allowance_amount || 0), 0),
          room: monthBills.reduce((sum, b) => sum + (b.room_rent_amount || 0), 0),
        }
      : undefined;

    await generateBillPDF(monthLabel, pdfStudents, {
      expense: mTotalExpense,
      collected: mTotalCollected,
      pending: mTotalPending,
    }, breakdown);
    setDownloading(false);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Fee Status</h2>

      {error && <ErrorBanner message={error} />}
      {genResult && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700">{genResult}</p>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3">
        <button
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">{getMonthName(month)} {year}</p>
          {isCurrentMonth && (
            <p className="text-[11px] text-teal-600 font-medium">Current Month</p>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Billing calculation breakdown */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-lg">
        <p className="text-sm text-slate-300 mb-3">{getMonthName(month)} {year} — Billing Breakdown</p>
        <div className="space-y-2 text-sm">
          {messBillTotal > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">Mess Bill (total)</span>
                <span className="font-semibold">{formatCurrency(messBillTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mess per day cost</span>
                <span className="font-semibold text-teal-300">{formatCurrency(messPerDayCost)}</span>
              </div>
            </>
          )}
          {commonBillTotal > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">Common Bill (total)</span>
                <span className="font-semibold">{formatCurrency(commonBillTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Common Bill per student</span>
                <span className="font-semibold text-blue-300">{formatCurrency(commonBillPerStudent)}</span>
              </div>
            </>
          )}
          {allowanceTotal > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">Allowance (total)</span>
                <span className="font-semibold">{formatCurrency(allowanceTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Allowance per day cost</span>
                <span className="font-semibold text-amber-300">{formatCurrency(allowancePerDay)}</span>
              </div>
            </>
          )}
          {roomRentTotal > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">Room Rent (total)</span>
                <span className="font-semibold">{formatCurrency(roomRentTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room Rent per student</span>
                <span className="font-semibold text-violet-300">{formatCurrency(roomRentPerStudent)}</span>
              </div>
            </>
          )}
          {totalExpense <= 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Total expense</span>
              <span className="font-semibold">{formatCurrency(totalExpense)}</span>
            </div>
          )}
          <div className="border-t border-slate-700 pt-2 flex justify-between">
            <span className="text-slate-300 font-medium">Total expense</span>
            <span className="font-bold">{formatCurrency(totalExpense)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total present days (all students)</span>
            <span className="font-semibold">{totalPresentDays}</span>
          </div>
        </div>
        {totalExpense <= 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-amber-300">Add expense items on the Home tab first.</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-100 mb-2" />
          <p className="text-2xl font-bold">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-emerald-100">Collected</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
          <Clock className="h-5 w-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </div>
      </div>

      {/* Billing days toggle — only for current month */}
      {isCurrentMonth && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Billing Period</p>
              <p className="text-xs text-slate-500 mt-0.5">Include last day of previous month?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIncludePrevDay(false)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  !includePrevDay
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {daysInMonth} days
              </button>
              <button
                onClick={() => setIncludePrevDay(true)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  includePrevDay
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {daysInMonth + 1} days
              </button>
            </div>
          </div>
          {includePrevDay && (
            <p className="mt-2 text-xs text-teal-600 bg-teal-50 rounded-lg px-3 py-2">
              Billing includes the last day of the previous month, making it a {daysInMonth + 1}-day cycle.
            </p>
          )}
        </div>
      )}

      {/* Generate bills + Download PDF buttons — only for current month */}
      {isCurrentMonth && (
        <>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateBills}
              disabled={generating || totalExpense <= 0 || students.length === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                {generating ? 'Generating...' : 'Generate Bills'}
              </span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading || students.length === 0 || totalExpense <= 0}
              className="btn-secondary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span className="hidden sm:inline">PDF</span>
              </span>
            </button>
          </div>
          {totalExpense <= 0 && students.length > 0 && (
            <p className="text-xs text-amber-600 text-center -mt-2">
              {isPreviousMonth
                ? `Add expense items for ${getMonthName(month)} ${year} on the Home tab first.`
                : 'Add expense items on the Home tab first.'}
            </p>
          )}
        </>
      )}

      {/* Download PDF button for past months viewed via month navigation */}
      {!isCurrentMonth && viewedMonthBills.length > 0 && (
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex items-center justify-center gap-2">
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Download PDF for {getMonthName(month)} {year}
          </span>
        </button>
      )}

      {/* Current month student fees */}
      {students.length === 0 ? (
        <EmptyState icon={Users} title="No students" description="Add students to see fee status." />
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{getMonthName(month)} {year} — Per Student</p>
          {studentFeeStatus.map((s) => {
            const bill = currentMonthBills.find((b) => b.student_id === s.student.id);
            return (
            <div key={s.student.id} className="card">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{s.student.full_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.presentDays} present days</p>
                  <div className="mt-1.5 space-y-0.5">
                    {s.messPortion > 0 && (
                      <p className="text-[11px] text-slate-400">Mess: {formatCurrency(s.messPortion)}</p>
                    )}
                    {s.commonPortion > 0 && (
                      <p className="text-[11px] text-slate-400">Common: {formatCurrency(s.commonPortion)}</p>
                    )}
                    {s.allowancePortion > 0 && (
                      <p className="text-[11px] text-amber-600">Allowance: {formatCurrency(s.allowancePortion)}</p>
                    )}
                    {s.roomPortion > 0 && (
                      <p className="text-[11px] text-slate-400">Room Rent: {formatCurrency(s.roomPortion)}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-slate-900">{formatCurrency(s.amount)}</p>
                  {bill ? (
                    <button
                      onClick={() => toggleBillStatus(bill.id, s.status)}
                      disabled={updatingBillId === bill.id}
                      className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        s.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {updatingBillId === bill.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : s.status === 'paid' ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <Clock size={12} />
                      )}
                      {s.status === 'paid' ? 'Paid' : 'Pending'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600">Pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Past months */}
      {Object.keys(billsByMonth)
        .sort()
        .reverse()
        .map((monthKey) => {
          const monthBills = billsByMonth[monthKey];
          const monthCollected = monthBills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
          const monthPending = monthBills.filter((b) => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0);
          return (
            <div key={monthKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{formatMonthLabel(monthKey)}</p>
                <button
                  onClick={() => handleDownloadPDFForMonth(monthKey)}
                  disabled={downloading || monthBills.length === 0}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  PDF
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <p className="text-[11px] text-emerald-600 font-medium">Collected</p>
                  <p className="text-sm font-bold text-emerald-700">{formatCurrency(monthCollected)}</p>
                </div>
                <div className="flex-1 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-[11px] text-amber-600 font-medium">Pending</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(monthPending)}</p>
                </div>
              </div>
              {monthBills.map((bill) => {
                const student = students.find((s) => s.id === bill.student_id);
                if (!student) return null;
                return (
                  <div key={bill.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{bill.present_days} days present</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-900">{formatCurrency(bill.amount)}</p>
                        <button
                          onClick={() => toggleBillStatus(bill.id, bill.status)}
                          disabled={updatingBillId === bill.id}
                          className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            bill.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          {updatingBillId === bill.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : bill.status === 'paid' ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
    </div>
  );
}
