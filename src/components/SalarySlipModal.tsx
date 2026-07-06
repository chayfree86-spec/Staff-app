import React from 'react';
import { useStore } from '../store/useStore';
import { format, parseISO } from 'date-fns';
import { getEffectivePerDayRate, getSalaryCycleForDate, getSalaryCycleForLabel } from '../utils/salary';
import { jsPDF } from 'jspdf';

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  monthLabel: string; // e.g. "July 2026"
}

const numberToWords = (num: number): string => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (num === 0) return 'zero';

  let words = '';

  if (num >= 100000) {
    words += numberToWords(Math.floor(num / 100000)) + 'lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    words += numberToWords(Math.floor(num / 1000)) + 'thousand ';
    num %= 1000;
  }
  if (num >= 100) {
    words += numberToWords(Math.floor(num / 100)) + 'hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (num < 20) {
      words += a[num];
    } else {
      words += b[Math.floor(num / 10)] + ' ' + a[num % 10];
    }
  }
  return words.trim();
};

const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, c => c.toUpperCase());
};

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  isOpen,
  onClose,
  staffId,
  monthLabel,
}) => {
  const { staffList, attendance, advanceList, deductionList, payoutList, businessInfo, settings, currentDate } = useStore();

  const staff = staffList.find((s) => s.id === staffId);
  if (!staff || !isOpen) return null;

  // 1. Derive the salary cycle straight from monthLabel (e.g. "July 2026").
  let targetYearMonth = '';
  try {
    targetYearMonth = format(new Date(monthLabel), 'yyyy-MM');
  } catch {
    targetYearMonth = format(new Date(), 'yyyy-MM');
  }
  const targetCycle = getSalaryCycleForLabel(targetYearMonth, settings.salaryCycleStart);

  // 2. Compute attendance metrics for the cycle
  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let holidayDays = 0;

  Object.entries(attendance).forEach(([dateStr, record]) => {
    if (dateStr > currentDate) return;
    if (dateStr >= targetCycle.start && dateStr <= targetCycle.end && record[staffId]) {
      const status = record[staffId].status;
      if (status === 'Present') presentDays++;
      if (status === 'Absent') absentDays++;
      if (status === 'Half Day') halfDays++;
      if (status === 'Holiday') holidayDays++;
    }
  });

  const creditedHolidayDays = settings.weeklyHolidayPaid === 'Unpaid' ? 0 : holidayDays;
  const totalDaysCredited = presentDays + (halfDays * 0.5) + creditedHolidayDays;
  const perDayVal = getEffectivePerDayRate(staff, targetCycle, settings.monthCalculation);

  const getStaffOutstandingAdvance = (sId: string) => {
    const staffAdvances = advanceList.filter((a) => a.staffId === sId);
    const totalGiven = staffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
    const totalReturned = staffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
    return Math.max(0, totalGiven - totalReturned);
  };
  const outstandingAdvance = getStaffOutstandingAdvance(staffId);

  // 3. Compute earnings and deductions
  const earned = staff.calculationBasis === 'Fixed Salary' && staff.salaryType === 'Monthly'
    ? staff.monthlySalary
    : Math.round(totalDaysCredited * perDayVal);

  const advanceAdjusted = Math.abs(
    advanceList
      .filter((a) => a.staffId === staffId && a.amount < 0 && a.date >= targetCycle.start && a.date <= targetCycle.end)
      .reduce((sum, item) => sum + item.amount, 0)
  );

  const deduction = deductionList
    .filter((d) => d.staffId === staffId && d.date >= targetCycle.start && d.date <= targetCycle.end)
    .reduce((sum, item) => sum + item.amount, 0);

  const paid = payoutList
    .filter((p) => p.staffId === staffId && p.month === monthLabel)
    .reduce((sum, item) => sum + item.amount, 0);

  // Hold / release details
  let holdAmount = 0;
  let releasedAmount = 0;

  const joiningCycle = getSalaryCycleForDate(staff.joiningDate, settings.salaryCycleStart);
  const holdDays = settings.newStaffSalaryHoldDays || 0;

  if (holdDays > 0) {
    if (joiningCycle.label === targetCycle.label) {
      if (staff.releasedSalaryHold) {
        holdAmount = 0;
        releasedAmount = Math.round(holdDays * perDayVal);
      } else {
        holdAmount = Math.min(earned, Math.round(holdDays * perDayVal));
      }
    }
    if (
      staff.status === 'Inactive' &&
      staff.deactivationDate &&
      staff.deactivationDate >= targetCycle.start &&
      staff.deactivationDate <= targetCycle.end
    ) {
      if (!staff.releasedSalaryHold) {
        releasedAmount = Math.round(holdDays * perDayVal);
      }
    }
  }

  const netPayable = Math.max(0, earned - advanceAdjusted - deduction - holdAmount + releasedAmount);

  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  // 4. PDF Generation Helper — builds PDF directly with jsPDF (no html2canvas, no font hanging)
  const generatePDFBlob = (): { blob: Blob; filename: string } | null => {
    try {
      // ── Colors (always light/professional for PDF)
      const WHITE      = '#FFFFFF';
      const BG         = '#FAF9FF';
      const PRIMARY    = '#7C3AED';
      const BORDER     = '#E9DFFF';
      const TEXT_DARK  = '#0F172A';
      const TEXT_LIGHT = '#64748B';
      const GREEN      = '#10B981';
      const RED        = '#F43F5E';
      const AMBER      = '#F59E0B';
      const WHITE_SOFT = '#F3EEFF'; // used instead of rgba white
      const NET_BADGE  = '#9D69F5'; // used instead of rgba white on purple

      const pageW = 210;
      const pad   = 12;
      const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      let y = pad;

      // ── Helpers
      const fillRect = (x: number, yy: number, w: number, h: number, fill: string) => {
        pdf.setFillColor(fill);
        pdf.rect(x, yy, w, h, 'F');
      };

      const strokeRect = (x: number, yy: number, w: number, h: number, stroke: string, lw = 0.2) => {
        pdf.setDrawColor(stroke);
        pdf.setLineWidth(lw);
        pdf.rect(x, yy, w, h, 'D');
      };

      const fillStrokeRect = (x: number, yy: number, w: number, h: number, fill: string, stroke: string) => {
        pdf.setFillColor(fill);
        pdf.setDrawColor(stroke);
        pdf.setLineWidth(0.2);
        pdf.rect(x, yy, w, h, 'FD');
      };

      const txt = (
        t: string, x: number, yy: number, size: number,
        color: string, bold = false, align: 'left' | 'right' | 'center' = 'left'
      ) => {
        pdf.setFontSize(size);
        pdf.setTextColor(color);
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.text(t, x, yy, { align });
      };

      const ln = (x1: number, y1: number, x2: number, y2: number, color: string, lw = 0.2) => {
        pdf.setDrawColor(color);
        pdf.setLineWidth(lw);
        pdf.line(x1, y1, x2, y2);
      };

      const inr = (n: number) => 'Rs.' + n.toLocaleString('en-IN');

      // ═══════════════════════════════════════════
      // PAGE BACKGROUND
      // ═══════════════════════════════════════════
      fillRect(0, 0, pageW, 297, BG);

      // TOP accent bar
      fillRect(0, 0, pageW, 2.5, PRIMARY);

      // ═══════════════════════════════════════════
      // HEADER
      // ═══════════════════════════════════════════
      y = 10;
      txt(businessInfo.name.toUpperCase(), pad, y, 13, TEXT_DARK, true);
      y += 5;
      if (businessInfo.address) { txt(businessInfo.address, pad, y, 7, TEXT_LIGHT); y += 4; }
      if (businessInfo.mobile)  { txt('Phone: ' + businessInfo.mobile, pad, y, 7, TEXT_LIGHT); y += 4; }

      txt('SALARY PAYSLIP', pageW - pad, 12, 11, PRIMARY, true, 'right');
      txt('Month: ' + monthLabel.toUpperCase(), pageW - pad, 18, 7, TEXT_LIGHT, false, 'right');

      y = Math.max(y, 22);
      ln(pad, y, pageW - pad, y, PRIMARY, 0.5);
      y += 6;

      // ═══════════════════════════════════════════
      // EMPLOYEE DETAILS
      // ═══════════════════════════════════════════
      const half = pageW / 2;
      const rowH = 6;
      const details: [string, string, string, string][] = [
        ['Employee Name:', staff.name, 'Joining Date:', format(parseISO(staff.joiningDate), 'dd MMM yyyy')],
        ['Designation:',  `${staff.salaryType}`, 'Salary Basis:', staff.calculationBasis],
        ['Mobile:',       staff.mobile || '—', 'Salary Type:', `${staff.salaryType} (${inr(staff.monthlySalary)}/mo)`],
      ];
      details.forEach(([l1, v1, l2, v2]) => {
        txt(l1, pad,         y, 7.5, TEXT_LIGHT);
        txt(v1, half - 2,    y, 7.5, TEXT_DARK, true, 'right');
        txt(l2, half + 2,    y, 7.5, TEXT_LIGHT);
        txt(v2, pageW - pad, y, 7.5, TEXT_DARK, true, 'right');
        y += rowH;
        ln(pad, y - 1, half - 2, y - 1, BORDER, 0.1);
        ln(half + 2, y - 1, pageW - pad, y - 1, BORDER, 0.1);
      });
      y += 3;
      ln(pad, y, pageW - pad, y, BORDER, 0.2);
      y += 5;

      // ═══════════════════════════════════════════
      // ATTENDANCE SUMMARY
      // ═══════════════════════════════════════════
      txt('ATTENDANCE SUMMARY', pad, y, 7, TEXT_LIGHT, true);
      y += 4;

      const attCols = [
        { label: 'PRESENT',   val: String(presentDays),       color: GREEN },
        { label: 'HALF DAY',  val: String(halfDays),          color: AMBER },
        { label: 'HOLIDAY',   val: String(holidayDays),       color: '#8B5CF6' },
        { label: 'ABSENT',    val: String(absentDays),        color: RED },
        { label: 'PAID DAYS', val: String(totalDaysCredited), color: PRIMARY },
      ];
      const barH = 14;
      const colW = (pageW - pad * 2) / attCols.length;
      fillStrokeRect(pad, y, pageW - pad * 2, barH, WHITE, BORDER);
      attCols.forEach((col, i) => {
        const cx = pad + colW * i + colW / 2;
        txt(col.label, cx, y + 5,  6, col.color, true,  'center');
        txt(col.val,   cx, y + 11, 9, col.color, true,  'center');
        if (i < attCols.length - 1) ln(pad + colW * (i + 1), y + 2, pad + colW * (i + 1), y + barH - 2, BORDER, 0.2);
      });
      y += barH + 5;

      // ═══════════════════════════════════════════
      // EARNINGS & DEDUCTIONS
      // ═══════════════════════════════════════════
      const tblW  = (pageW - pad * 2) / 2 - 1;
      const tblX2 = pad + tblW + 2;

      fillRect(pad,   y, tblW, 7, WHITE_SOFT);
      txt('EARNINGS',   pad + 3,   y + 4.5, 7.5, PRIMARY, true);
      fillRect(tblX2, y, tblW, 7, WHITE_SOFT);
      txt('DEDUCTIONS', tblX2 + 3, y + 4.5, 7.5, PRIMARY, true);
      y += 9;

      const earningRows: [string, number][] = [['Basic Salary', earned]];
      if (releasedAmount > 0) earningRows.push(['Released Hold', releasedAmount]);

      const deductionRows: [string, number, string][] = [
        ['Advance Adjusted', advanceAdjusted, RED],
        ['Other Deductions', deduction, RED],
      ];
      if (holdAmount > 0)        deductionRows.push(['Salary Hold', holdAmount, AMBER]);
      if (outstandingAdvance > 0) deductionRows.push(['Outstanding Advance', outstandingAdvance, AMBER]);

      const maxRows = Math.max(earningRows.length, deductionRows.length);
      const cellH = 6;
      for (let i = 0; i < maxRows; i++) {
        const rowY = y + i * cellH;
        if (earningRows[i]) {
          const [lbl, val] = earningRows[i];
          txt(lbl, pad + 3, rowY + 4, 7.5, TEXT_LIGHT);
          txt(inr(val), pad + tblW - 3, rowY + 4, 7.5, TEXT_DARK, true, 'right');
        }
        if (deductionRows[i]) {
          const [lbl, val, col] = deductionRows[i];
          txt(lbl, tblX2 + 3, rowY + 4, 7.5, TEXT_LIGHT);
          txt(inr(val), tblX2 + tblW - 3, rowY + 4, 7.5, col, true, 'right');
        }
      }
      y += maxRows * cellH + 2;

      // Totals row
      fillRect(pad,   y, tblW, 7, '#EDE9FE');
      txt('Total Earnings',   pad + 3,   y + 4.5, 7.5, TEXT_DARK, true);
      txt(inr(earned + releasedAmount), pad + tblW - 3, y + 4.5, 7.5, PRIMARY, true, 'right');

      fillRect(tblX2, y, tblW, 7, '#EDE9FE');
      txt('Total Deductions', tblX2 + 3, y + 4.5, 7.5, TEXT_DARK, true);
      txt(inr(advanceAdjusted + deduction + holdAmount), tblX2 + tblW - 3, y + 4.5, 7.5, RED, true, 'right');
      y += 10;

      // ═══════════════════════════════════════════
      // NET PAY BOX
      // ═══════════════════════════════════════════
      const netAmt    = paid > 0 ? paid : netPayable;
      const netStatus = paid >= netPayable ? 'FULLY PAID' : paid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
      fillRect(pad, y, pageW - pad * 2, 18, PRIMARY);
      txt('NET PAYOUT', pad + 4, y + 5.5, 6.5, WHITE_SOFT, true);
      txt(netPayWords, pad + 4, y + 11, 6.5, WHITE_SOFT);
      txt(inr(netAmt), pageW - pad - 4, y + 9, 14, WHITE, true, 'right');
      // Status badge (solid color instead of rgba)
      fillRect(pageW - pad - 30, y + 11, 26, 5, NET_BADGE);
      txt(netStatus, pageW - pad - 4, y + 14.5, 5.5, WHITE, true, 'right');
      y += 22;

      // ═══════════════════════════════════════════
      // PAYOUT HISTORY
      // ═══════════════════════════════════════════
      const slipPayouts = payoutList.filter(p => p.staffId === staffId && p.month === monthLabel);
      if (slipPayouts.length > 0) {
        txt('PAYMENT DETAILS', pad, y, 7, TEXT_LIGHT, true);
        y += 5;
        slipPayouts.forEach((p, idx) => {
          const txLine = `Tx #${idx + 1}  ${format(parseISO(p.date), 'dd MMM yyyy')}  ${p.paymentMode || 'Cash'}${p.remarks ? '  (' + p.remarks + ')' : ''}`;
          txt(txLine, pad + 3, y, 7, TEXT_LIGHT);
          txt(inr(p.amount), pageW - pad - 3, y, 7, TEXT_DARK, true, 'right');
          y += 6;
        });
        y += 2;
      }

      // ═══════════════════════════════════════════
      // SIGNATURE SECTION
      // ═══════════════════════════════════════════
      y += 12;
      ln(pad + 5,        y, pad + 60,        y, BORDER, 0.3);
      ln(pageW - pad - 60, y, pageW - pad - 5, y, BORDER, 0.3);
      y += 4;
      txt('Employer Signature', pad + 32.5,       y, 7, TEXT_LIGHT, true, 'center');
      txt('Employee Signature', pageW - pad - 32.5, y, 7, TEXT_LIGHT, true, 'center');

      // BOTTOM accent bar
      fillRect(0, 290, pageW, 7, PRIMARY);

      const filename = `Salary_Slip_${staff.name.replace(/\s+/g, '_')}_${monthLabel.replace(/\s+/g, '_')}.pdf`;
      return { blob: pdf.output('blob'), filename };
    } catch (error: any) {
      console.error('PDF generation error:', error);
      alert('PDF error: ' + (error?.message || String(error)));
      return null;
    }
  };


  // 5. Download Handler
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    // Use setTimeout so React re-renders the loading state before heavy sync work
    setTimeout(() => {
      try {
        const pdfData = generatePDFBlob();
        if (pdfData) {
          const { blob, filename } = pdfData;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 50);
  };

  // 6. Share Handler
  const handleSharePDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise(r => setTimeout(r, 50)); // let React render loading state
    try {
      const pdfData = generatePDFBlob();
      if (!pdfData) return;
      const { blob, filename } = pdfData;
      const file = new File([blob], filename, { type: 'application/pdf' });
      const shareText = `Salary Slip - ${monthLabel}\n-------------------------\nBusiness: ${businessInfo.name}\nEmployee: ${staff.name}\nNet Paid: Rs.${(paid > 0 ? paid : netPayable).toLocaleString('en-IN')}\n-------------------------`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Salary Slip - ${staff.name}`, text: shareText });
      } else {
        // Desktop fallback: download file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        alert('PDF downloaded! On mobile, use "Share PDF" button to share via WhatsApp directly.');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share error:', error);
        alert('Share error: ' + (error?.message || String(error)));
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };



  const getStaffRoleText = () => `${staff.salaryType} • ${staff.calculationBasis}`;

  const netPayWords = capitalizeWords(numberToWords(paid > 0 ? paid : netPayable)) + ' Rupees Only';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-app-surface border border-app-border/85 rounded-3xl shadow-xl w-full max-w-2xl max-h-[98vh] flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-3.5 border-b border-app-border/60 shrink-0">
          <h2 className="text-xs font-black text-app-text-primary uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-rounded text-primary" style={{ fontSize: '16px' }}>receipt_long</span>
            <span>Salary Slip Viewer</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-app-bg text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Modal Scroll-Free Content Area */}
        <div className="flex-grow p-4 md:p-5 overflow-hidden flex flex-col justify-center bg-app-surface">
          {/* Printable Slip Container */}
          <div
            id="print-payslip"
            className="bg-app-bg text-app-text-primary p-4 md:p-5 rounded-2xl border border-app-border/50 flex flex-col gap-3.5 text-left shadow-sm shrink-0"
          >
            {/* Top Header */}
            <div className="flex justify-between items-center border-b-2 border-primary pb-3 gap-4">
              <div>
                <h2 className="text-sm font-black text-app-text-primary leading-none uppercase">
                  {businessInfo.name}
                </h2>
                <p className="text-[8.5px] text-app-text-secondary font-bold mt-1 leading-none">
                  {businessInfo.address}
                </p>
                <p className="text-[8.5px] text-app-text-secondary font-bold leading-none mt-0.5">
                  Phone: {businessInfo.mobile}
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-xs font-black text-primary uppercase tracking-wider leading-none">
                  Salary Payslip
                </h1>
                <p className="text-[8.5px] text-app-text-secondary font-black uppercase mt-1 leading-none">
                  Month: {monthLabel}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] pb-2.5 border-b border-app-border/40">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between border-b border-app-border/10 pb-0.5">
                  <span className="text-app-text-secondary font-semibold">Employee Name:</span>
                  <span className="font-bold text-app-text-primary">{staff.name}</span>
                </div>
                <div className="flex justify-between border-b border-app-border/10 pb-0.5">
                  <span className="text-app-text-secondary font-semibold">Designation:</span>
                  <span className="font-bold text-app-text-primary">{getStaffRoleText()}</span>
                </div>
                <div className="flex justify-between border-b border-app-border/10 pb-0.5">
                  <span className="text-app-text-secondary font-semibold">Mobile:</span>
                  <span className="font-bold text-app-text-primary">{staff.mobile}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between border-b border-app-border/10 pb-0.5">
                  <span className="text-app-text-secondary font-semibold">Joining Date:</span>
                  <span className="font-bold text-app-text-primary">{format(parseISO(staff.joiningDate), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between border-b border-app-border/10 pb-0.5">
                  <span className="text-app-text-secondary font-semibold">Salary Basis:</span>
                  <span className="font-bold text-app-text-primary">{staff.calculationBasis}</span>
                </div>
                <div className="flex justify-between border-b border-app-border/10 pb-0.5">
                  <span className="text-app-text-secondary font-semibold">Salary Type:</span>
                  <span className="font-bold text-app-text-primary">{staff.salaryType} (₹{staff.monthlySalary.toLocaleString('en-IN')}/mo)</span>
                </div>
              </div>
            </div>

            {/* Attendance breakdown */}
            <div className="flex flex-col gap-1">
              <h3 className="text-[8px] font-bold text-app-text-secondary uppercase tracking-widest leading-none">Attendance Summary</h3>
              <div className="grid grid-cols-5 bg-app-surface border border-app-border/50 rounded-xl py-1.5 text-center text-[9px] font-bold">
                <div className="border-r border-app-border/30">
                  <div className="text-emerald-600 dark:text-emerald-500 text-[7px] uppercase">Present</div>
                  <div className="text-emerald-600 dark:text-emerald-500 font-black mt-0.5">{presentDays}</div>
                </div>
                <div className="border-r border-app-border/30">
                  <div className="text-amber-500 dark:text-amber-400 text-[7px] uppercase">Half Day</div>
                  <div className="text-amber-500 dark:text-amber-400 font-black mt-0.5">{halfDays}</div>
                </div>
                <div className="border-r border-app-border/30">
                  <div className="text-blue-500 dark:text-blue-400 text-[7px] uppercase">Holiday</div>
                  <div className="text-blue-500 dark:text-blue-400 font-black mt-0.5">{holidayDays}</div>
                </div>
                <div className="border-r border-app-border/30">
                  <div className="text-rose-500 dark:text-rose-400 text-[7px] uppercase">Absent</div>
                  <div className="text-rose-500 dark:text-rose-400 font-black mt-0.5">{absentDays}</div>
                </div>
                <div>
                  <div className="text-primary text-[7px] uppercase">Paid Days</div>
                  <div className="text-primary font-black mt-0.5">{totalDaysCredited}</div>
                </div>
              </div>
            </div>

            {/* Salary Table (Earnings & Deductions side by side) */}
            <div className="grid grid-cols-2 border border-app-border rounded-xl overflow-hidden divide-x divide-app-border text-[9px] bg-app-surface/40">
              {/* Earnings Column */}
              <div className="flex flex-col">
                <div className="bg-app-surface border-b border-app-border font-black text-app-text-primary uppercase px-2.5 py-1 text-[8px] tracking-wider">
                  Earnings
                </div>
                <div className="flex flex-col p-2.5 gap-1.5 flex-grow">
                  <div className="flex justify-between">
                    <span className="text-app-text-secondary">Basic Salary</span>
                    <span className="font-semibold text-app-text-primary">₹{earned.toLocaleString('en-IN')}</span>
                  </div>
                  {releasedAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-450 font-bold">
                      <span>Released Hold</span>
                      <span>₹{releasedAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
                <div className="bg-app-surface/50 border-t border-app-border px-2.5 py-1 flex justify-between font-black text-app-text-primary">
                  <span>Total Earnings</span>
                  <span>₹{(earned + releasedAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="flex flex-col">
                <div className="bg-app-surface border-b border-app-border font-black text-app-text-primary uppercase px-2.5 py-1 text-[8px] tracking-wider">
                  Deductions
                </div>
                <div className="flex flex-col p-2.5 gap-1.5 flex-grow">
                  <div className="flex justify-between">
                    <span className="text-app-text-secondary">Advance Adjusted</span>
                    <span className="font-semibold text-rose-600">₹{advanceAdjusted.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-app-text-secondary">Other Deductions</span>
                    <span className="font-semibold text-rose-600">₹{deduction.toLocaleString('en-IN')}</span>
                  </div>
                  {holdAmount > 0 && (
                    <div className="flex justify-between text-amber-600 font-bold">
                      <span>Salary Hold</span>
                      <span>₹{holdAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {outstandingAdvance > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t border-app-border/20 pt-1.5 mt-0.5">
                      <span>Outstanding Advance</span>
                      <span>₹{outstandingAdvance.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
                <div className="bg-app-surface/50 border-t border-app-border px-2.5 py-1 flex justify-between font-black text-app-text-primary">
                  <span>Total Deductions</span>
                  <span>₹{(advanceAdjusted + deduction + holdAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Box */}
            <div className="bg-primary text-white rounded-xl p-2.5 flex justify-between items-center gap-4">
              <div>
                <div className="text-[7px] uppercase tracking-widest text-white/70 font-bold leading-none">Net Payout</div>
                <div className="text-[8px] text-white/90 font-medium mt-1 italic leading-none">{netPayWords}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-black text-white leading-none">₹{(paid > 0 ? paid : netPayable).toLocaleString('en-IN')}</div>
                <span className="inline-block px-1.5 py-0.5 rounded bg-white/20 font-black text-[7px] uppercase tracking-wider mt-1 leading-none">
                  {paid >= netPayable ? 'Fully Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid'}
                </span>
              </div>
            </div>

            {/* Payout Transactions History List */}
            {payoutList.filter(p => p.staffId === staffId && p.month === monthLabel).length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-[8px] font-bold text-app-text-secondary uppercase tracking-widest leading-none">Payment Details</h3>
                <div className="flex flex-col gap-0.5 text-[8.5px] bg-app-surface/30 p-2 rounded-xl border border-app-border/40 max-h-[50px] overflow-y-auto">
                  {payoutList
                    .filter(p => p.staffId === staffId && p.month === monthLabel)
                    .map((p, idx) => (
                      <div key={p.id} className="flex justify-between items-center py-0.5 border-b border-app-border/10 last:border-b-0">
                        <div>
                          <span className="font-bold text-app-text-primary">Tx #{idx+1}</span> •{' '}
                          <span className="text-app-text-secondary">{format(parseISO(p.date), 'dd MMM yyyy')}</span> •{' '}
                          <span className="font-extrabold text-primary">{p.paymentMode || 'Cash'}</span>
                          {p.remarks && <span className="text-app-text-secondary italic ml-1">({p.remarks})</span>}
                        </div>
                        <span className="font-black text-app-text-primary">₹{p.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Footer and Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 text-[8.5px] font-bold text-app-text-secondary select-none uppercase tracking-wider text-center">
              <div>
                <div className="border-t border-app-border/40 pt-1 mx-auto max-w-[100px]">
                  Employer Signature
                </div>
              </div>
              <div>
                <div className="border-t border-app-border/40 pt-1 mx-auto max-w-[100px]">
                  Employee Signature
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-app-bg border-t border-app-border/60 flex flex-col sm:flex-row sm:justify-end gap-2 shrink-0 w-full">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto px-4 py-3 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {isGeneratingPdf ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>download</span>
                <span>Download PDF</span>
              </>
            )}
          </button>
          <button
            onClick={handleSharePDF}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto px-4 py-3 bg-app-surface border border-app-border hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 text-app-text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            {isGeneratingPdf ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-app-text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>share</span>
                <span>Share PDF</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto px-4 py-3 bg-app-surface border border-app-border text-app-text-secondary hover:text-app-text-primary disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
