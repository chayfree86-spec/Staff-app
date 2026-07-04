import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { useAlertConfirm } from '../components/ui/AlertConfirmProvider';
import { format, parseISO } from 'date-fns';

export const AdvanceHistoryScreen: React.FC = () => {
  const { confirm } = useAlertConfirm();
  const {
    activeStaffProfileId,
    staffList,
    advanceList,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    currentDate,
    setScreen,
  } = useStore();

  const staff = staffList.find((s) => s.id === activeStaffProfileId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [advanceType, setAdvanceType] = useState<'Give' | 'Return'>('Give');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [txDate, setTxDate] = useState(currentDate);
  const [txError, setTxError] = useState('');
  const [isCalOpen, setIsCalOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editType, setEditType] = useState<'Give' | 'Return'>('Give');
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
          onClick={() => setScreen('staff')}
          className="mt-5 px-6 py-2.5 bg-primary text-white rounded-app-card text-xs font-bold shadow-md hover:bg-opacity-95 cursor-pointer"
        >
          Back to Staff
        </button>
      </div>
    );
  }

  const allStaffAdvances = advanceList
    .filter((a) => a.staffId === staff.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const allTimeGiven = allStaffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
  const allTimeReturned = allStaffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const allTimeNet = allTimeGiven - allTimeReturned;

  const handleOpenAdd = () => {
    setAdvanceType('Give');
    setAmount('');
    setRemarks('');
    setTxDate(currentDate);
    setTxError('');
    setIsAddOpen(true);
  };

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) {
      setTxError('Please enter amount.');
      return;
    }
    setTxError('');
    const finalAmount = advanceType === 'Give' ? Number(amount) : -Number(amount);
    const defaultRemarks = advanceType === 'Give' ? 'Advance given' : 'Advance returned';
    addAdvance(staff.id, finalAmount, txDate, remarks || defaultRemarks);
    setIsAddOpen(false);
  };

  const handleOpenEdit = (record: { id: string; amount: number; date: string; remarks: string }) => {
    const isReturn = record.amount < 0;
    setEditId(record.id);
    setEditType(isReturn ? 'Return' : 'Give');
    setEditAmount(String(Math.abs(record.amount)));
    setEditRemarks(record.remarks);
    setEditDate(record.date);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleUpdateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount.trim()) {
      setEditError('Please enter amount.');
      return;
    }
    setEditError('');
    const finalAmount = editType === 'Give' ? Number(editAmount) : -Number(editAmount);
    updateAdvance(editId, finalAmount, editDate, editRemarks);
    setIsEditOpen(false);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('Are you sure you want to delete this advance entry?', {
      title: 'Delete Advance Entry',
      type: 'danger',
      confirmText: 'Delete',
    });
    if (confirmed) {
      deleteAdvance(id);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('staff-profile')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-app-text-primary">Advance History</h2>
          <p className="text-[10px] text-app-text-secondary font-bold uppercase tracking-wider">{staff.name}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/10 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>add</span>
          <span>Advance</span>
        </button>
      </div>

      {/* All-time Stats Box */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
        <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-3 gap-2 text-center select-none">
          <div>
            <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">Total Outstanding</div>
            <div className="text-sm font-black text-rose-600 mt-1">₹{allTimeNet.toLocaleString('en-IN')}</div>
          </div>
          <div className="border-l border-app-border/40">
            <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">Total Given</div>
            <div className="text-sm font-black text-primary mt-1">₹{allTimeGiven.toLocaleString('en-IN')}</div>
          </div>
          <div className="border-l border-app-border/40">
            <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">Total Returned</div>
            <div className="text-sm font-black text-emerald-600 mt-1">₹{allTimeReturned.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Full list of all advances */}
      <div className="flex flex-col gap-2">
        {allStaffAdvances.length === 0 ? (
          <div className="bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
            <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">wallet</span>
            <p className="mt-2 text-sm font-semibold">No advances recorded for this staff member.</p>
          </div>
        ) : (
          allStaffAdvances.map((a) => {
            const isReturn = a.amount < 0;
            const displayAmount = Math.abs(a.amount);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-app-border/40 bg-app-surface hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-150 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isReturn
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-primary/10 text-primary dark:bg-primary/20'
                  }`}>
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>
                      {isReturn ? 'price_check' : 'wallet'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-xs">
                      {isReturn ? 'Returned' : 'Given'}
                    </h4>
                    <p className="text-[10px] text-app-text-secondary group-hover:text-app-text-primary mt-0.5 transition-colors">
                      {format(parseISO(a.date), 'dd MMM yyyy')} • {a.remarks || (isReturn ? 'Advance returned' : 'Advance given')}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 font-bold text-xs ${isReturn ? 'text-emerald-600' : 'text-primary'}`}>
                  <span>{isReturn ? '-' : '+'}₹{displayAmount.toLocaleString('en-IN')}</span>
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="w-6 h-6 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Advance Modal */}
      <CustomDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Advance Transaction"
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
              onClick={handleAddAdvance}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
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
        <form onSubmit={handleAddAdvance} className="flex flex-col gap-4">
          {txError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {txError}
            </div>
          )}

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
              placeholder={advanceType === 'Give' ? 'e.g. Rent advance' : 'e.g. Returned back to office'}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </CustomDialog>

      {/* Edit Advance Modal */}
      <CustomDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Advance Transaction"
        actions={
          <>
            <button
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateAdvance}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                editType === 'Give'
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
              }`}
            >
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateAdvance} className="flex flex-col gap-4">
          {editError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {editError}
            </div>
          )}

          <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
            <button
              type="button"
              onClick={() => setEditType('Give')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                editType === 'Give'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              Give
            </button>
            <button
              type="button"
              onClick={() => setEditType('Return')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                editType === 'Return'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              Return
            </button>
          </div>

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
