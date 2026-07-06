// Shared by every salary-earning calculation site (Dashboard, Salary, Staff,
// StaffProfile, Reports, SalarySlipModal, DeductionHistory, More) so the
// "Salary Cycle Start Day" and "Month Calculation" settings behave
// identically everywhere instead of duplicating (and risking drift in) this
// logic per screen. Mirrors api/helpers.php's salary_cycle_for_date() and
// effective_per_day_rate() — keep both in sync.

export interface SalaryCycle {
  /** 'YYYY-MM' — the month this cycle is labelled/grouped under (the month
   *  the cycle's last day falls in). Used for display and as the
   *  salary_month DB key. */
  label: string;
  /** 'YYYY-MM-DD' inclusive start of the cycle. */
  start: string;
  /** 'YYYY-MM-DD' inclusive end of the cycle. */
  end: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Returns the salary cycle that a given date falls into. When cycleStartDay
// is 1 (the default), this is exactly the calendar month. When it's e.g. 26,
// a date like 2026-07-10 falls in the cycle 2026-06-26..2026-07-25,
// labelled '2026-07' (the month the cycle ends in — the "July payroll").
export function getSalaryCycleForDate(dateStr: string, cycleStartDay: number): SalaryCycle {
  const clampedStart = Math.min(Math.max(1, Math.round(cycleStartDay) || 1), 28);
  const [y, m, day] = dateStr.split('-').map(Number);
  if (!y || !m || !day) {
    return { label: dateStr.slice(0, 7), start: dateStr, end: dateStr };
  }

  let startYear = y;
  let startMonth = m - 1; // 0-indexed
  if (day < clampedStart) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const start = new Date(startYear, startMonth, clampedStart);
  const end = new Date(startYear, startMonth + 1, clampedStart - 1);

  return {
    label: `${end.getFullYear()}-${pad2(end.getMonth() + 1)}`,
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
}

// Returns the cycle whose label matches the given 'YYYY-MM', using the same
// cycleStartDay convention as getSalaryCycleForDate. Used when a screen only
// has a month label (e.g. from a dropdown or a stored payout's month) and
// needs the actual date range back. The label is the month the cycle's LAST
// day falls in, so day 1 of the label month is always still within that same
// cycle (day 1 is always < any valid cycleStartDay except 1, where the cycle
// starts on day 1 anyway) — a safe probe date.
export function getSalaryCycleForLabel(yearMonthLabel: string, cycleStartDay: number): SalaryCycle {
  const [y, m] = yearMonthLabel.split('-').map(Number);
  if (!y || !m) {
    return { label: yearMonthLabel, start: `${yearMonthLabel}-01`, end: `${yearMonthLabel}-31` };
  }
  const probeDate = `${y}-${pad2(m)}-01`;
  return getSalaryCycleForDate(probeDate, cycleStartDay);
}

export function isDateInCycle(dateStr: string, cycle: SalaryCycle): boolean {
  return dateStr >= cycle.start && dateStr <= cycle.end;
}

function daysBetweenInclusive(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// "Fixed 30 Days" keeps the flat rate already stored on the staff record
// (monthlySalary / 30, set when the staff is created/edited).
// "Actual Calendar Month" re-derives the day rate from the real number of
// days in the given cycle (28-31), so a 31-day cycle pays less per day than
// a 28-day cycle for the same monthly salary.
//
// Only applies to Monthly + Attendance Based staff; Daily-rate staff and
// Fixed Salary staff are unaffected (their pay isn't derived from a
// per-day/days-in-cycle split).
export function getEffectivePerDayRate(
  staff: {
    perDaySalary: number;
    monthlySalary: number;
    salaryType: 'Monthly' | 'Daily';
    calculationBasis: 'Attendance Based' | 'Fixed Salary';
  },
  cycle: SalaryCycle,
  monthCalculation: 'Actual Calendar Month' | 'Fixed 30 Days'
): number {
  if (staff.salaryType !== 'Monthly' || staff.calculationBasis !== 'Attendance Based') {
    return staff.perDaySalary;
  }
  if (monthCalculation !== 'Actual Calendar Month') {
    return staff.perDaySalary;
  }

  const days = daysBetweenInclusive(cycle.start, cycle.end);
  if (days <= 0) {
    return staff.perDaySalary;
  }

  return Math.round(staff.monthlySalary / days);
}
