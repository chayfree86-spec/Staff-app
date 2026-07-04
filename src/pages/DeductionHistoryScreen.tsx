import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { useAlertConfirm } from '../components/ui/AlertConfirmProvider';
import { format, parseISO } from 'date-fns';

export const DeductionHistoryScreen: React.FC = () => {
  const { confirm } = useAlertConfirm();
  const {
    activeStaffProfileId,
    previousScreen,
    staffList,
    deductionList,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    currentDate,
    setScreen,
  } = useStore();

  const staff = staffList.find((s) => s.id === activeStaffProfileId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [txDate, setTxDate] = useState(currentDate);
  const [txError, setTxError] = useState('');
  const [isCalOpen, setIsCalOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState('');

  if (!staff) {
    return (
      <div className="p-8 text-center text-app-text-secondary bg-app-surface border border-app-border rounded-app-card max-w-md mx-auto mt-12 shadow-sm">
        <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700 select-none">
          error
        </span>
        <p className="mt-3 text-sm">Staff member not found.</p>
        <button
          onClick={() => setScreen(previousScreen || 'staff')}
          className="mt-5 px-6 py-2.5 bg-primary text-white rounded-app-card text-xs font-bold shadow-md hover:bg-opacity-95 cursor-pointer"
        >
          Back to Staff
        </button>
      </div>
    );
  }

  const allStaffDeductions = deductionList
    .filter((d) => d.staffId === staff.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const allTimeTotal = allStaffDeductions.reduce((sum, d) => sum + d.amount, 0);

  const currentYearMonth = currentDate.slice(0, 7);
  const monthTotal = allStaffDeductions
    .filter((d) => d.date.startsWith(currentYearMonth))
    .reduce((sum, d) => sum + d.amount, 0);

  const handleOpenAdd = () => {
    setAmount('');
    setRemarks('');
    setTxDate(currentDate);
    setTxError('');
    setIsAddOpen(true);
  };

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) {
      setTxError('Please enter amount.');
      return;
    }
    setTxError('');
    addDeduction(staff.id, Number(amount), txDate, remarks || 'Deduction added');
    setIsAddOpen(false);
  };

  const handleOpenEdit = (record: { id: string; amount: number; date: string; remarks: string }) => {
    setEditId(record.id);
    setEditAmount(String(record.amount));
    setEditRemarks(record.remarks);
    setEditDate(record.date);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleUpdateDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount.trim()) {
      setEditError('Please enter amount.');
      return;
    }
    setEditError('');
    updateDeduction(editId, Number(editAmount), editDate, editRemarks);
    setIsEditOpen(false);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('Are you sure you want to delete this deduction?', {
      title: 'Delete Deduction',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (confirmed) {
      deleteDeduction(id);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24 animate-in fade-in duration-200 w-full">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen(previousScreen || 'staff-profile')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <div className="flex-1 select-none text-left">
          <h2 className="text-xl font-extrabold text-app-text-primary tracking-tight">Deduction History</h2>
          <p className="text-xs text-app-text-secondary font-semibold uppercase tracking-wider">{staff.name}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-500/10 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>add</span>
          <span>Deduction</span>
        </button>
      </div>

      {/* All-time Stats Box */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
        <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-2 gap-2 text-center select-none">
          <div>
            <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">This Month</div>
            <div className="text-sm font-black text-rose-600 mt-1">₹{monthTotal.toLocaleString('en-IN')}</div>
          </div>
          <div className="border-l border-app-border/40">
            <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">All-Time Total</div>
            <div className="text-sm font-black text-rose-600 mt-1">₹{allTimeTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Full list of all deductions */}
      {/* List of deductions - Mobile Card View */}
      <div className="flex flex-col gap-2 sm:hidden">
        {allStaffDeductions.length === 0 ? (
          <div className="bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
            <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">remove_circle</span>
            <p className="mt-2 text-sm font-semibold">No deductions recorded for this staff member.</p>
          </div>
        ) : (
          allStaffDeductions.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-app-border/40 bg-app-surface hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-150 group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>remove_circle</span>
                </div>
                <div>
                  <h4 className="font-bold text-app-text-primary text-xs">{d.remarks || 'Deduction'}</h4>
                  <p className="text-[10px] text-app-text-secondary group-hover:text-app-text-primary mt-0.5 transition-colors">
                    {format(parseISO(d.date), 'dd MMM yyyy')} • Deduction
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-bold text-rose-600 text-xs">
                <span>₹{d.amount.toLocaleString('en-IN')}</span>
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    onClick={() => handleOpenEdit(d)}
                    className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="w-6 h-6 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* List of deductions - Desktop Table View */}
      <div className="hidden sm:block bg-black/[0.012] dark:bg-white/[0.012] border border-app-border rounded-[22px] p-1.5 shadow-sm overflow-hidden w-full">
        <div className="bg-app-surface border border-app-border/40 rounded-[18px] overflow-hidden">
          {allStaffDeductions.length === 0 ? (
            <div className="p-12 text-center text-app-text-secondary">
              <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">remove_circle</span>
              <p className="mt-2 text-sm font-semibold">No deductions recorded for this staff member.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-app-bg border-b border-app-border/60 text-app-text-secondary font-black uppercase text-[9px] tracking-wider select-none">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-center">Type</th>
                    <th className="px-5 py-3.5">Remarks</th>
                    <th className="px-5 py-3.5 text-right text-rose-500">Amount</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/40 font-semibold text-app-text-primary">
                  {allStaffDeductions.map((d) => {
                    return (
                      <tr key={d.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                        <td className="px-5 py-3.5 font-bold">
                          {format(parseISO(d.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[9px] uppercase tracking-wider">
                            Deduction
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-app-text-secondary font-medium truncate max-w-[200px]">
                          {d.remarks || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-sm text-rose-600">
                          -₹{d.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(d)}
                              className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="w-7 h-7 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Deduction Modal */}
      <CustomDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Deduction / Fine"
        bodyClass={isCalOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
        actions={
          <>
            <button
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDeduction}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-500/10"
            >
              Confirm
            </button>
          </>
        }
      >
        <form onSubmit={handleAddDeduction} className="flex flex-col gap-4">
          {txError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {txError}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
            <CustomDatePicker
              value={txDate}
              onChange={(val) => setTxDate(val)}
              onOpenChange={setIsCalOpen}
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
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Uniform damage cost"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </CustomDialog>

      {/* Edit Deduction Modal */}
      <CustomDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Deduction / Fine"
        actions={
          <>
            <button
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateDeduction}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-500/10"
            >
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateDeduction} className="flex flex-col gap-4">
          {editError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {editError}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
            <CustomDatePicker value={editDate} onChange={(val) => setEditDate(val)} className="w-full" inline />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Amount</label>
            <input
              type="number"
              placeholder="₹"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
            <input
              type="text"
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </CustomDialog>
    </div>
  );
};
