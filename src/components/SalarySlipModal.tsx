import React from 'react';
import { useStore } from '../store/useStore';
import { format, parseISO } from 'date-fns';
import { getEffectivePerDayRate, getSalaryCycleForDate, getSalaryCycleForLabel } from '../utils/salary';
import html2canvas from 'html2canvas';
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

  // 4. PDF Generation Helper
  const generatePDFBlob = async (): Promise<{ blob: Blob; filename: string } | null> => {
    const element = document.getElementById('print-payslip');
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution capture
        useCORS: true,
        backgroundColor: null, // Keep the same view background color (as seen on screen)
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 standard width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [imgWidth, imgHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const filename = `Salary_Slip_${staff.name.replace(/\s+/g, '_')}_${monthLabel.replace(/\s+/g, '_')}.pdf`;
      return { blob: pdf.output('blob'), filename };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  // 5. Download Handler
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) {
        alert('Failed to generate PDF. Please try again.');
        return;
      }
      const { blob, filename } = pdfData;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 6. Share Handler
  const handleSharePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfData = await generatePDFBlob();
      if (!pdfData) {
        alert('Failed to generate PDF. Please try again.');
        return;
      }
      const { blob, filename } = pdfData;
      const file = new File([blob], filename, { type: 'application/pdf' });

      const shareText = `Salary Slip - ${monthLabel}\n-------------------------\nBusiness: ${businessInfo.name}\nEmployee: ${staff.name}\nNet Paid: ₹${(paid > 0 ? paid : netPayable).toLocaleString('en-IN')}\n-------------------------`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Salary Slip - ${staff.name}`,
          text: shareText,
        });
      } else {
        // Fallback: Download file and copy text summary
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        await navigator.clipboard.writeText(shareText);
        alert('PDF downloaded! Sharing files is not supported on this browser/device, but the salary slip text summary has been copied to your clipboard so you can paste it along with the PDF.');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
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
