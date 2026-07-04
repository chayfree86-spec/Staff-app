import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { format, parseISO } from 'date-fns';

export const AdvanceScreen: React.FC = () => {
  const {
    staffList,
    advanceList,
    deductionList,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    setScreen,
    currentDate,
  } = useStore();

  const [search, setSearch] = useState('');
  
  // Give Advance Form States
  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [giveError, setGiveError] = useState('');
  const [advanceType, setAdvanceType] = useState<'Give' | 'Return'>('Give');
  const [txDate, setTxDate] = useState(currentDate);
  const [isAdvanceCalOpen, setIsAdvanceCalOpen] = useState(false);

  // History Page States
  const [selectedStaffIdForHistory, setSelectedStaffIdForHistory] = useState<string | null>(null);
  const [historyMonthFilter, setHistoryMonthFilter] = useState('All');

  // Edit Dialog States
  const [editingAdvance, setEditingAdvance] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editError, setEditError] = useState('');
  const [editAdvanceType, setEditAdvanceType] = useState<'Give' | 'Return'>('Give');
  const [isEditCalOpen, setIsEditCalOpen] = useState(false);

  // Delete Confirmation States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeStaff = staffList.filter(s => s.status === 'Active');

  // Calculates financial details for all staff
  const getOutstandingAdvance = (targetStaffId: string) => {
    const totalAdv = advanceList
      .filter(a => a.staffId === targetStaffId)
      .reduce((sum, item) => sum + item.amount, 0);
    const totalDed = deductionList
      .filter(d => d.staffId === targetStaffId)
      .reduce((sum, item) => sum + item.amount, 0);
    return Math.max(0, totalAdv - totalDed);
  };

  const totalOutstanding = staffList.reduce(
    (sum, s) => sum + getOutstandingAdvance(s.id),
    0
  );

  // Filter staff list based on search
  const filteredStaff = activeStaff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleGiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !amount.trim()) {
      setGiveError('Please select staff and enter amount.');
      return;
    }
    setGiveError('');
    const finalAmount = advanceType === 'Give' ? Number(amount) : -Number(amount);
    const defaultRemarks = advanceType === 'Give' ? 'Advance given' : 'Advance returned';
    addAdvance(staffId, finalAmount, txDate, remarks || defaultRemarks);
    
    // Reset Form
    setStaffId('');
    setAmount('');
    setRemarks('');
    setIsGiveModalOpen(false);
  };

  const startEdit = (adv: any) => {
    setEditingAdvance(adv);
    const isReturn = adv.amount < 0;
    setEditAdvanceType(isReturn ? 'Return' : 'Give');
    setEditAmount(Math.abs(adv.amount).toString());
    setEditDate(adv.date);
    setEditRemarks(adv.remarks);
    setEditError('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount.trim() || !editDate.trim()) {
      setEditError('Please fill in all fields.');
      return;
    }
    setEditError('');
    const finalAmount = editAdvanceType === 'Give' ? Number(editAmount) : -Number(editAmount);
    updateAdvance(editingAdvance.id, finalAmount, editDate, editRemarks);
    setEditingAdvance(null);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      deleteAdvance(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

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

  // Get details for history sub-view
  const selectedStaff = staffList.find(s => s.id === selectedStaffIdForHistory);
  const selectedStaffOutstanding = selectedStaff ? getOutstandingAdvance(selectedStaff.id) : 0;
  
  const staffAdvances = selectedStaffIdForHistory 
    ? advanceList.filter(a => a.staffId === selectedStaffIdForHistory)
    : [];

  const historyMonths = Array.from(new Set(
    staffAdvances.map(a => {
      try {
        return format(parseISO(a.date), 'MMMM yyyy');
      } catch (err) {
        return '';
      }
    }).filter(Boolean)
  )).sort((a, b) => b.localeCompare(a));

  const historyMonthOptions = [
    { value: 'All', label: 'All Months' },
    ...historyMonths.map(m => ({ value: m, label: m }))
  ];

  const filteredStaffAdvances = staffAdvances
    .filter(a => {
      if (historyMonthFilter === 'All') return true;
      try {
        const mLabel = format(parseISO(a.date), 'MMMM yyyy');
        return mLabel === historyMonthFilter;
      } catch (err) {
        return false;
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Render the core layout inside the page
  const renderPageContent = () => {
    // 1. If a staff's history is selected, render the Transaction History sub-page
    if (selectedStaffIdForHistory && selectedStaff) {
      return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedStaffIdForHistory(null)}
                className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-rounded select-none">arrow_back</span>
              </button>
              <h2 className="text-sm font-black text-app-text-primary tracking-tight select-none">
                Advance History: {selectedStaff.name}
              </h2>
            </div>
            
            {/* Add Advance Button matching profile style */}
            <button
              onClick={() => {
                setStaffId(selectedStaff.id);
                setAmount('');
                setRemarks('');
                setGiveError('');
                setIsGiveModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>add</span>
              <span>Add Advance</span>
            </button>
          </div>

          {/* Outstanding, Given, Adjusted Summary Card for Selected Staff */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-3 gap-4 text-center divide-x divide-app-border/40">
              
              {/* Outstanding (बकाया) */}
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-rose-500/10 text-rose-600 w-max mx-auto block select-none">
                  Outstanding
                </span>
                <h3 className="text-xl md:text-2xl font-black text-rose-500 mt-2">
                  ₹{selectedStaffOutstanding.toLocaleString('en-IN')}
                </h3>
              </div>

              {/* Total Given (लिया है) */}
              <div className="pl-2">
                <span className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-primary/10 text-primary w-max mx-auto block select-none">
                  Total Given
                </span>
                <h3 className="text-xl md:text-2xl font-black text-primary mt-2">
                  ₹{staffAdvances.reduce((sum, a) => sum + a.amount, 0).toLocaleString('en-IN')}
                </h3>
              </div>

              {/* Total Adjusted (जमा किया है) */}
              <div className="pl-2">
                <span className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-emerald-500/10 text-emerald-600 w-max mx-auto block select-none">
                  Total Adjusted
                </span>
                <h3 className="text-xl md:text-2xl font-black text-emerald-600 mt-2">
                  ₹{deductionList.filter(d => d.staffId === selectedStaff.id).reduce((sum, d) => sum + d.amount, 0).toLocaleString('en-IN')}
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

          {/* List of advances in page (Table Format / Mobile Cards) */}
          <div className="flex flex-col gap-3.5">
            <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.15em] select-none px-1">
              Advances History Ledger
            </h4>
            
            {/* Mobile Card List */}
            <div className="flex flex-col gap-3.5 sm:hidden">
              {filteredStaffAdvances.map((adv) => (
                <div 
                  key={adv.id}
                  className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm"
                >
                  <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-4 flex flex-col gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-app-text-secondary">
                        {format(parseISO(adv.date), 'dd MMM yyyy')}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase select-none ${
                        adv.amount < 0 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-primary/10 text-primary dark:bg-primary/20'
                      }`}>
                        {adv.amount < 0 ? 'Credit' : 'Debit'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] uppercase font-bold text-app-text-secondary tracking-wider leading-none">Remarks</span>
                        <span className="text-xs font-bold text-app-text-primary mt-1">{adv.remarks}</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[8px] uppercase font-bold text-app-text-secondary tracking-wider leading-none block">Amount</span>
                        <span className={`text-base font-black leading-none block mt-1 ${
                          adv.amount < 0 
                            ? 'text-emerald-600 dark:text-emerald-500' 
                            : 'text-primary'
                        }`}>
                          {adv.amount < 0 ? '-' : '+'}₹{Math.abs(adv.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-3 border-t border-app-border/40 mt-1">
                      <button
                        onClick={() => startEdit(adv)}
                        className="px-3 py-1.5 rounded-xl text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 dark:hover:bg-indigo-950/30 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-rounded select-none text-sm">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(adv.id)}
                        className="px-3 py-1.5 rounded-xl text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 dark:hover:bg-rose-950/30 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-rounded select-none text-sm">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredStaffAdvances.length === 0 && (
                <div className="bg-app-surface border border-app-border/50 rounded-2xl p-8 text-center text-xs text-app-text-secondary font-semibold">
                  No transactions found for this period.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
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
                          Debit / Credit
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
                      {filteredStaffAdvances.map((adv) => (
                        <tr 
                          key={adv.id}
                          className="hover:bg-primary/[0.01] transition-colors border-b border-app-border/10 last:border-b-0"
                        >
                          {/* Date Cell */}
                          <td className="px-6 py-4.5 text-xs font-semibold text-app-text-secondary whitespace-nowrap">
                            {format(parseISO(adv.date), 'dd MMM yyyy')}
                          </td>
                          
                          {/* Remarks Cell */}
                          <td className="px-6 py-4.5 text-xs font-bold text-app-text-primary">
                            {adv.remarks}
                          </td>

                          {/* Debit / Credit Type Cell */}
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase select-none ${
                              adv.amount < 0 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                : 'bg-primary/10 text-primary dark:bg-primary/20'
                            }`}>
                              {adv.amount < 0 ? 'Credit (Cr)' : 'Debit (Dr)'}
                            </span>
                          </td>
                          
                          {/* Amount Cell */}
                          <td className={`px-6 py-4.5 text-xs font-black whitespace-nowrap ${
                            adv.amount < 0 
                              ? 'text-emerald-600 dark:text-emerald-500' 
                              : 'text-primary'
                          }`}>
                            {adv.amount < 0 ? '-' : '+'}₹{Math.abs(adv.amount).toLocaleString('en-IN')}
                          </td>
                          
                          {/* Actions Cell */}
                          <td className="px-6 py-4.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(adv)}
                                className="w-7 h-7 rounded-full text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>edit</span>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(adv.id)}
                                className="w-7 h-7 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredStaffAdvances.length === 0 && (
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
            className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-rounded select-none">arrow_back</span>
          </button>
          <h2 className="text-sm font-black text-app-text-primary tracking-tight select-none">Advance Ledger</h2>
        </div>

        {/* Outstanding Summary card */}
        <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-between gap-4">
            <div>
              <div className="rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-black bg-amber-500/10 text-amber-600 w-max select-none">
                Total Outstanding Advance
              </div>
              <h3 className="text-3xl font-black text-amber-500 mt-2.5">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </h3>
            </div>
            
            <button
              onClick={() => {
                setGiveError('');
                setIsGiveModalOpen(true);
              }}
              className="group/btn pl-4 pr-2 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-95 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer"
            >
              <span>Give Advance</span>
              <div className="w-5.5 h-5.5 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                <span className="material-symbols-rounded text-xs select-none">add</span>
              </div>
            </button>
          </div>
        </div>

        {/* Staff Ledger Balances Section */}
        <div className="flex flex-col gap-4">
          {/* Section Header with Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.15em] select-none">
              Staff Ledger Balances
            </h4>
            
            {/* Search Input for Staff */}
            <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-xl p-1 shadow-sm w-full sm:w-64">
              <div className="relative bg-app-surface border border-app-border/40 rounded-[10px] h-9">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 h-full bg-transparent text-[11px] text-app-text-primary placeholder:text-app-text-secondary focus:outline-none font-semibold"
                />
              </div>
            </div>
          </div>
          
          {/* Staff cards grid / Mobile List */}
          {/* Mobile List View */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            {filteredStaff.map((s) => {
              const outstanding = getOutstandingAdvance(s.id);
              const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const profileGradient = getProfileGradient(s.name);
              
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStaffIdForHistory(s.id);
                    setHistoryMonthFilter('All');
                  }}
                  className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-xl p-1 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="bg-app-surface border border-app-border/40 rounded-[10px] p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {s.profileImage ? (
                        <img
                          src={s.profileImage}
                          alt={s.name}
                          className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border border-app-border/40"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${profileGradient} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 border-0`}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-app-text-primary text-xs">{s.name}</h4>
                        <span className="text-[8px] font-black text-app-text-secondary uppercase tracking-wider block mt-0.5">Staff Ledger</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none block">Outstanding</span>
                        <span className={`text-sm font-black mt-1 leading-none block ${outstanding > 0 ? 'text-amber-500 font-extrabold' : 'text-app-text-secondary'}`}>
                          ₹{outstanding.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="w-6.5 h-6.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded select-none text-xs font-bold">chevron_right</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredStaff.length === 0 && (
              <div className="bg-app-surface border border-app-border rounded-xl p-12 text-center text-app-text-secondary">
                <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700 select-none">
                  group
                </span>
                <p className="mt-2 text-sm font-semibold">No staff members found.</p>
              </div>
            )}
          </div>

          {/* Desktop Table/Grid View */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filteredStaff.map((s) => {
              const outstanding = getOutstandingAdvance(s.id);
              const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const profileGradient = getProfileGradient(s.name);
              const outstandingColor = outstanding > 0 
                ? `bg-gradient-to-r ${profileGradient} bg-clip-text text-transparent` 
                : 'text-app-text-secondary';

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedStaffIdForHistory(s.id);
                    setHistoryMonthFilter('All');
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
                        Staff Ledger
                      </p>
                    </div>
                    
                    {/* Amount Section */}
                    <div className="mt-3.5 w-full border-t border-app-border/40 pt-2.5">
                      <span className={`text-xl font-black leading-none tracking-tight block ${outstandingColor}`}>
                        ₹{outstanding.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[8px] font-extrabold text-app-text-secondary uppercase tracking-widest block mt-0.5">
                        Outstanding
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
      </div>
    );
  };

  return (
    <div className="pb-24">
      {renderPageContent()}

      {/* Give Advance Dialog */}
      {isGiveModalOpen && (
        <CustomDialog
          isOpen={isGiveModalOpen}
          onClose={() => setIsGiveModalOpen(false)}
          title="Advance Transaction"
          bodyClass={isAdvanceCalOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
          actions={
            <>
              <button
                onClick={() => setIsGiveModalOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveSubmit}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm ${
                  advanceType === 'Give' 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                }`}
              >
                Confirm
              </button>
            </>
          }
        >
          <form onSubmit={handleGiveSubmit} className="flex flex-col gap-4">
            {giveError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {giveError}
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

            {/* Transaction Type Tab Selector */}
            <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
              <button
                type="button"
                onClick={() => {
                  setAdvanceType('Give');
                  if (!remarks || remarks === 'Advance returned') setRemarks('Advance given');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  advanceType === 'Give'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Give
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdvanceType('Return');
                  if (!remarks || remarks === 'Advance given') setRemarks('Advance returned');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  advanceType === 'Return'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Return
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
              <CustomDatePicker
                value={txDate}
                onChange={(val) => setTxDate(val)}
                onOpenChange={setIsAdvanceCalOpen}
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
                placeholder={advanceType === 'Give' ? 'e.g. Rent advance' : 'e.g. Returned back to office'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </form>
        </CustomDialog>
      )}

      {/* Edit Advance Dialog */}
      {editingAdvance && (
        <CustomDialog
          isOpen={editingAdvance !== null}
          onClose={() => setEditingAdvance(null)}
          title="Edit Advance Transaction"
          bodyClass={isEditCalOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
          actions={
            <>
              <button
                type="button"
                onClick={() => setEditingAdvance(null)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm ${
                  editAdvanceType === 'Give'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                }`}
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

            {/* Transaction Type Tab Selector for Edit */}
            <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
              <button
                type="button"
                onClick={() => {
                  setEditAdvanceType('Give');
                  if (!editRemarks || editRemarks === 'Advance returned') setEditRemarks('Advance given');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  editAdvanceType === 'Give'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Give
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditAdvanceType('Return');
                  if (!editRemarks || editRemarks === 'Advance given') setEditRemarks('Advance returned');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  editAdvanceType === 'Return'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Return
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
              <CustomDatePicker
                value={editDate}
                onChange={(val) => setEditDate(val)}
                onOpenChange={setIsEditCalOpen}
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
                placeholder={editAdvanceType === 'Give' ? 'e.g. Rent advance' : 'e.g. Returned back to office'}
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
            <h4 className="font-bold text-app-text-primary text-sm mt-1">Delete Advance Record?</h4>
            <p className="text-xs text-app-text-secondary leading-relaxed max-w-xs">
              Are you sure you want to permanently delete this advance transaction? This action will adjust the staff member's ledger outstanding balance immediately.
            </p>
          </div>
        </CustomDialog>
      )}
    </div>
  );
};
