import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { format, parseISO } from 'date-fns';

export const DeductionScreen: React.FC = () => {
  const {
    staffList,
    deductionList,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    setScreen,
    currentDate,
  } = useStore();

  const [search, setSearch] = useState('');
  
  // Add Deduction Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [txDate, setTxDate] = useState(currentDate);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [error, setError] = useState('');

  // History Sub-page States
  const [selectedStaffIdForHistory, setSelectedStaffIdForHistory] = useState<string | null>(null);
  const [historyMonthFilter, setHistoryMonthFilter] = useState(currentDate.slice(0, 7));

  // Edit Deduction States
  const [editingDeduction, setEditingDeduction] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editError, setEditError] = useState('');
  const [isEditDatePickerOpen, setIsEditDatePickerOpen] = useState(false);

  // Delete Confirmation States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeStaff = staffList.filter(s => s.status === 'Active');

  const getProfileGradient = (name: string) => {
    const gradients = [
      'from-indigo-600 to-purple-600',
      'from-emerald-600 to-teal-600',
      'from-rose-600 to-orange-500',
      'from-blue-600 to-indigo-600',
      'from-amber-500 to-rose-600',
      'from-violet-600 to-fuchsia-600',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  // Calculates total deductions for a target staff
  const getStaffDeductionsTotal = (targetStaffId: string) => {
    return deductionList
      .filter(d => d.staffId === targetStaffId)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  // Overall total deductions for active staff
  const totalDeductionsAll = staffList.reduce(
    (sum, s) => sum + getStaffDeductionsTotal(s.id),
    0
  );

  // Filter staff list based on search
  const filteredStaff = activeStaff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !amount.trim()) {
      setError('Please select staff and enter amount.');
      return;
    }
    setError('');
    addDeduction(staffId, Number(amount), txDate, remarks || 'Salary Deduction');
    
    // Reset Form
    setStaffId('');
    setAmount('');
    setRemarks('');
    setIsModalOpen(false);
  };

  const startEdit = (ded: any) => {
    setEditingDeduction(ded);
    setEditAmount(ded.amount.toString());
    setEditDate(ded.date);
    setEditRemarks(ded.remarks);
    setEditError('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount.trim() || !editDate.trim()) {
      setEditError('Please fill in all fields.');
      return;
    }
    setEditError('');
    updateDeduction(editingDeduction.id, Number(editAmount), editDate, editRemarks);
    setEditingDeduction(null);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      deleteDeduction(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const renderPageContent = () => {
    // 1. Render Sub-page: Detailed History for Selected Staff
    if (selectedStaffIdForHistory) {
      const selectedStaff = staffList.find(s => s.id === selectedStaffIdForHistory);
      if (!selectedStaff) return null;

      const staffDeductions = deductionList.filter(d => d.staffId === selectedStaff.id);

      // Calculations for metrics
      const totalAllTime = getStaffDeductionsTotal(selectedStaff.id);
      
      const thisMonthDeds = deductionList.filter(d => {
        if (d.staffId !== selectedStaff.id) return false;
        const dDate = parseISO(d.date);
        const cDate = parseISO(currentDate);
        return dDate.getMonth() === cDate.getMonth() && dDate.getFullYear() === cDate.getFullYear();
      });
      const totalThisMonth = thisMonthDeds.reduce((sum, d) => sum + d.amount, 0);
      const totalCount = staffDeductions.length;

      // Extract unique months for filter options
      const uniqueMonths = Array.from(
        new Set(
          staffDeductions.map(d => {
            const date = parseISO(d.date);
            return format(date, 'yyyy-MM');
          })
        )
      ).sort((a, b) => b.localeCompare(a));

      const currentMonthVal = currentDate.slice(0, 7);
      const allFilterMonths = Array.from(new Set([currentMonthVal, ...uniqueMonths])).sort((a, b) => b.localeCompare(a));

      const historyMonthOptions = [
        { value: 'All', label: 'All Months' },
        ...allFilterMonths.map(m => {
          const date = parseISO(`${m}-01`);
          return { value: m, label: format(date, 'MMMM yyyy') };
        })
      ];

      // Filter deductions list based on selected month
      const filteredStaffDeductions = staffDeductions.filter(d => {
        if (historyMonthFilter === 'All') return true;
        return d.date.startsWith(historyMonthFilter);
      }).sort((a, b) => b.date.localeCompare(a.date));

      return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Sub-page Header bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedStaffIdForHistory(null)}
                className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shrink-0"
              >
                <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
              </button>
              <h2 className="text-sm font-black text-app-text-primary tracking-tight select-none">
                Deduction History: <span className="text-primary">{selectedStaff.name}</span>
              </h2>
            </div>

            {/* Add Deduction Button matching profile style */}
            <button
              onClick={() => {
                setStaffId(selectedStaff.id);
                setAmount('');
                setRemarks('');
                setError('');
                setTxDate(currentDate);
                setIsModalOpen(true);
              }}
              className="pl-4 pr-2 py-2.5 bg-rose-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-rose-600 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer"
            >
              <span>Add Deduction</span>
              <div className="w-5.5 h-5.5 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-rounded text-xs font-bold select-none">add</span>
              </div>
            </button>
          </div>

          {/* Outstanding, Given, Adjusted Summary Card for Selected Staff */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-3 gap-4 text-center divide-x divide-app-border/40">
              
              {/* This Month (इस महीने) */}
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-rose-500/10 text-rose-600 w-max mx-auto block select-none">
                  This Month
                </span>
                <h3 className="text-xl md:text-2xl font-black text-rose-500 mt-2">
                  ₹{totalThisMonth.toLocaleString('en-IN')}
                </h3>
              </div>

              {/* All Time (कुल कटौती) */}
              <div className="pl-2">
                <span className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-primary/10 text-primary w-max mx-auto block select-none">
                  All Time
                </span>
                <h3 className="text-xl md:text-2xl font-black text-primary mt-2">
                  ₹{totalAllTime.toLocaleString('en-IN')}
                </h3>
              </div>

              {/* Total Fines (कुल संख्या) */}
              <div className="pl-2">
                <span className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-emerald-500/10 text-emerald-600 w-max mx-auto block select-none">
                  Total Fines
                </span>
                <h3 className="text-xl md:text-2xl font-black text-emerald-600 mt-2">
                  {totalCount}
                </h3>
              </div>

            </div>
          </div>

          {/* Filter Row */}
          <div className="w-full sm:w-64">
            <CustomSelect
              label="Filter by Month"
              value={historyMonthFilter}
              onChange={setHistoryMonthFilter}
              options={historyMonthOptions}
              placeholder="All Months"
            />
          </div>

          {/* List of deductions in page (Table Format) */}
          <div className="flex flex-col gap-3.5">
            <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.15em] select-none px-1">
              Deductions History Ledger
            </h4>
            
            <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <div className="bg-app-surface border border-app-border/40 rounded-[15px] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-primary/25 bg-primary/[0.03] dark:bg-primary/[0.08]">
                        <th className="px-6 py-4 text-[9.5px] font-black text-primary uppercase tracking-[0.15em] select-none">
                          Date
                        </th>
                        <th className="px-6 py-4 text-[9.5px] font-black text-primary uppercase tracking-[0.15em] select-none">
                          Remarks
                        </th>
                        <th className="px-6 py-4 text-[9.5px] font-black text-primary uppercase tracking-[0.15em] select-none">
                          Type
                        </th>
                        <th className="px-6 py-4 text-[9.5px] font-black text-primary uppercase tracking-[0.15em] select-none">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-[9.5px] font-black text-primary uppercase tracking-[0.15em] select-none text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border/40">
                      {filteredStaffDeductions.map((ded) => (
                        <tr 
                          key={ded.id}
                          className="hover:bg-primary/[0.01] transition-colors border-b border-app-border/10 last:border-b-0"
                        >
                          {/* Date Cell */}
                          <td className="px-6 py-4.5 text-xs font-semibold text-app-text-secondary whitespace-nowrap">
                            {format(parseISO(ded.date), 'dd MMM yyyy')}
                          </td>
                          
                          {/* Remarks Cell */}
                          <td className="px-6 py-4.5 text-xs font-bold text-app-text-primary">
                            {ded.remarks}
                          </td>

                          {/* Type Cell */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase select-none bg-rose-500/10 text-rose-600 dark:bg-rose-500/20">
                              Deduction
                            </span>
                          </td>
                          
                          {/* Amount Cell */}
                          <td className="px-6 py-4.5 text-xs font-black text-rose-600 dark:text-rose-500 whitespace-nowrap">
                            -₹{ded.amount.toLocaleString('en-IN')}
                          </td>
                          
                          {/* Actions Cell */}
                          <td className="px-6 py-4.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(ded)}
                                className="w-7 h-7 rounded-full text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>edit</span>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(ded.id)}
                                className="w-7 h-7 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredStaffDeductions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-xs text-app-text-secondary font-semibold">
                            No transactions found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. Otherwise, render the main staff ledger balances list
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-200">
        {/* Header bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('more')}
            className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shrink-0"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
          <h2 className="text-sm font-black text-app-text-primary tracking-tight select-none">Deduction Ledger</h2>
        </div>

        {/* Summary card */}
        <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-between gap-4">
            <div>
              <div className="rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-black bg-rose-500/10 text-rose-600 w-max select-none">
                Total Deductions / Fines
              </div>
              <h3 className="text-3xl font-black text-rose-500 mt-2.5">
                ₹{totalDeductionsAll.toLocaleString('en-IN')}
              </h3>
            </div>
            
            <button
              onClick={() => {
                setStaffId('');
                setAmount('');
                setRemarks('');
                setTxDate(currentDate);
                setError('');
                setIsModalOpen(true);
              }}
              className="pl-4 pr-2 py-2.5 bg-rose-505 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 hover:opacity-95 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer"
            >
              <span>Add Deduction</span>
              <div className="w-5.5 h-5.5 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-rounded text-xs font-bold select-none">add</span>
              </div>
            </button>
          </div>
        </div>

        {/* Search Bar - Double Bezel */}
        <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm">
          <div className="relative bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] h-11">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-3 h-full bg-transparent text-[11px] text-app-text-primary placeholder:text-app-text-secondary focus:outline-none font-semibold"
            />
          </div>
        </div>

        {/* Staff cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filteredStaff.map((s) => {
            const totalDeds = getStaffDeductionsTotal(s.id);
            const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const profileGradient = getProfileGradient(s.name);
            const deductionColor = totalDeds > 0 
              ? `bg-gradient-to-r ${profileGradient} bg-clip-text text-transparent` 
              : 'text-app-text-secondary';

            return (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedStaffIdForHistory(s.id);
                  setHistoryMonthFilter(currentDate.slice(0, 7));
                }}
                className="group bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 active:scale-[0.97] cursor-pointer"
              >
                <div className="bg-app-surface border border-app-border/40 rounded-[15px] p-4 flex flex-col items-center text-center h-full justify-between min-h-[160px]">
                  {/* Profile Avatar */}
                  {s.profileImage ? (
                    <img
                      src={s.profileImage}
                      alt={s.name}
                      className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border border-app-border/40"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(s.name)} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 border-0`}>
                      {initials}
                    </div>
                  )}
                  
                  {/* Name and Designation */}
                  <div className="mt-2.5 w-full">
                    <h5 className="font-black text-app-text-primary text-xs leading-tight truncate group-hover:text-primary transition-colors">
                      {s.name}
                    </h5>
                    <p className="text-[9px] font-bold text-app-text-secondary uppercase tracking-wider mt-0.5">
                      Deduction Ledger
                    </p>
                  </div>
                  
                  {/* Amount Section */}
                  <div className="mt-3.5 w-full border-t border-app-border/40 pt-2.5">
                    <span className={`text-xl font-black leading-none tracking-tight block ${deductionColor}`}>
                      ₹{totalDeds.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[8px] font-extrabold text-app-text-secondary uppercase tracking-widest block mt-0.5">
                      Total Fined
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredStaff.length === 0 && (
            <div className="col-span-full bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
              <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700 select-none">
                group
              </span>
              <p className="mt-2 text-sm font-semibold">No staff members found.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-24">
      {renderPageContent()}

      {/* Add Deduction Dialog */}
      {isModalOpen && (
        <CustomDialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Deduction / Fine"
          bodyClass={isDatePickerOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
          actions={
            <>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-rose-600/10"
              >
                Confirm
              </button>
            </>
          }
        >
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {error}
              </div>
            )}
            
            {!selectedStaffIdForHistory && (
              <CustomSelect
                label="Select Staff Member"
                value={staffId}
                onChange={setStaffId}
                options={activeStaff.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Choose staff member"
              />
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
              <CustomDatePicker
                value={txDate}
                onChange={(val) => setTxDate(val)}
                onOpenChange={setIsDatePickerOpen}
                className="w-full"
                inline
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Amount</label>
              <input
                type="number"
                placeholder="₹"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
              <input
                type="text"
                placeholder="e.g. Damage fine, Late penalty"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </form>
        </CustomDialog>
      )}

      {/* Edit Deduction Dialog */}
      {editingDeduction && (
        <CustomDialog
          isOpen={editingDeduction !== null}
          onClose={() => setEditingDeduction(null)}
          title="Edit Deduction / Fine"
          bodyClass={isEditDatePickerOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
          actions={
            <>
              <button
                type="button"
                onClick={() => setEditingDeduction(null)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-rose-600/10"
              >
                Save Changes
              </button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
            {editError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {editError}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
              <CustomDatePicker
                value={editDate}
                onChange={(val) => setEditDate(val)}
                onOpenChange={setIsEditDatePickerOpen}
                className="w-full"
                inline
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Amount</label>
              <input
                type="number"
                placeholder="₹"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
              <input
                type="text"
                placeholder="Remarks"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </form>
        </CustomDialog>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <CustomDialog
          isOpen={confirmDeleteId !== null}
          onClose={() => setConfirmDeleteId(null)}
          title="Confirm Deletion"
          actions={
            <>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-rose-600/10"
              >
                Delete
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center select-none shrink-0">
              <span className="material-symbols-rounded" style={{ fontSize: '32px' }}>
                warning
              </span>
            </div>
            <div>
              <h4 className="font-bold text-app-text-primary text-sm">Are you sure you want to delete this deduction?</h4>
              <p className="text-[10px] text-app-text-secondary mt-1">This action cannot be undone and will permanently delete this record.</p>
            </div>
          </div>
        </CustomDialog>
      )}
    </div>
  );
};
