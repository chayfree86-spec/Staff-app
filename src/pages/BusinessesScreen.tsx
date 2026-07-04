import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { useAlertConfirm } from '../components/ui/AlertConfirmProvider';
import {
  listBusinessesRequest,
  toggleUserActiveRequest,
  updateBusinessAccountRequest,
  deleteBusinessRequest,
  updateBusinessUserRequest,
  deleteBusinessUserRequest,
  type BusinessAccount,
  type BusinessUser,
} from '../api/client';

const inputClass =
  'w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary font-medium';
const labelClass = 'text-[10px] font-bold text-app-text-secondary uppercase tracking-wider';

export const BusinessesScreen: React.FC = () => {
  const { setScreen, currentUser } = useStore();
  const { confirm, alert } = useAlertConfirm();

  const [businesses, setBusinesses] = useState<BusinessAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit business
  const [editBusiness, setEditBusiness] = useState<BusinessAccount | null>(null);
  const [bizName, setBizName] = useState('');
  const [bizMobile, setBizMobile] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizError, setBizError] = useState('');
  const [bizSaving, setBizSaving] = useState(false);

  // Edit user
  const [editUser, setEditUser] = useState<{ businessId: string; user: BusinessUser } | null>(null);
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPin, setUserPin] = useState('');
  const [userError, setUserError] = useState('');
  const [userSaving, setUserSaving] = useState(false);

  const loadBusinesses = useCallback(async () => {
    setError('');
    try {
      const { businesses: list } = await listBusinessesRequest();
      setBusinesses(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load businesses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const handleToggleUser = async (businessId: string, userId: string, nextActive: boolean) => {
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === businessId
          ? { ...b, users: b.users.map((u) => (u.id === userId ? { ...u, isActive: nextActive } : u)) }
          : b
      )
    );
    try {
      await toggleUserActiveRequest(userId, nextActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user.');
      loadBusinesses();
    }
  };

  const openEditBusiness = (business: BusinessAccount) => {
    setEditBusiness(business);
    setBizName(business.name);
    setBizMobile(business.mobile || '');
    setBizAddress(business.address || '');
    setBizError('');
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBusiness) return;
    if (!bizName.trim()) {
      setBizError('Business name is required.');
      return;
    }
    setBizSaving(true);
    setBizError('');
    try {
      await updateBusinessAccountRequest({
        businessId: editBusiness.id,
        name: bizName.trim(),
        mobile: bizMobile.trim() || undefined,
        address: bizAddress.trim() || undefined,
      });
      setEditBusiness(null);
      loadBusinesses();
    } catch (err) {
      setBizError(err instanceof Error ? err.message : 'Could not update business.');
    } finally {
      setBizSaving(false);
    }
  };

  const handleDeleteBusiness = async (business: BusinessAccount) => {
    const confirmed = await confirm(
      `Delete "${business.name}"? This permanently removes all its staff, attendance, advances, deductions and salary records. This cannot be undone.`,
      { title: 'Delete Business', type: 'danger', confirmText: 'Delete' }
    );
    if (!confirmed) return;

    try {
      await deleteBusinessRequest(business.id);
      setBusinesses((prev) => prev.filter((b) => b.id !== business.id));
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Could not delete business.', {
        title: 'Delete Failed',
        type: 'danger',
      });
    }
  };

  const openEditUser = (businessId: string, user: BusinessUser) => {
    setEditUser({ businessId, user });
    setUserName(user.name);
    setUserMobile(user.mobile || '');
    setUserEmail(user.email || '');
    setUserPassword('');
    setUserPin('');
    setUserError('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!userName.trim()) {
      setUserError('User name is required.');
      return;
    }
    if (!userMobile.trim() && !userEmail.trim()) {
      setUserError('Mobile or email is required for login.');
      return;
    }
    if (userMobile.trim() && userMobile.trim().length !== 10) {
      setUserError('Mobile must be exactly 10 digits.');
      return;
    }
    if (userPassword.trim() && userPassword.trim().length < 4) {
      setUserError('New password must be at least 4 characters long.');
      return;
    }
    if (userPin.trim() && (userPin.trim().length < 4 || userPin.trim().length > 6)) {
      setUserError('PIN must be 4 to 6 digits.');
      return;
    }

    setUserSaving(true);
    setUserError('');
    try {
      await updateBusinessUserRequest({
        userId: editUser.user.id,
        name: userName.trim(),
        mobile: userMobile.trim() || undefined,
        email: userEmail.trim() || undefined,
        password: userPassword.trim() || undefined,
        pin: userPin.trim() || undefined,
      });
      setEditUser(null);
      loadBusinesses();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Could not update user.');
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (businessId: string, user: BusinessUser) => {
    const confirmed = await confirm(
      `Delete login user "${user.name}"? They will no longer be able to access this business.`,
      { title: 'Delete User', type: 'danger', confirmText: 'Delete' }
    );
    if (!confirmed) return;

    try {
      await deleteBusinessUserRequest(user.id);
      setBusinesses((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, users: b.users.filter((u) => u.id !== user.id) } : b))
      );
    } catch (err) {
      await alert(err instanceof Error ? err.message : 'Could not delete user.', {
        title: 'Delete Failed',
        type: 'danger',
      });
    }
  };

  const getBusinessInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'B';

  return (
    <div className="flex flex-col gap-4 pb-24 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('more')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <h2 className="text-base font-bold text-app-text-primary flex-1">Businesses & Users</h2>
        <button
          onClick={() => setScreen('create-business')}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-primary/10 hover:bg-opacity-95 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>add_business</span>
          <span>New Business</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs font-semibold border border-red-200 flex items-center gap-2">
          <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>error</span>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary text-sm font-semibold">
          Loading businesses...
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {businesses.map((business) => {
            const isOwnBusiness = currentUser?.businessId === business.id;
            return (
              <div
                key={business.id}
                className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
              >
                <div className="bg-app-surface border border-app-border/40 rounded-[18px] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                  {/* Business header */}
                  <div className="p-5 flex items-center justify-between gap-4 border-b border-app-border/40">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-accent/30 to-emerald-500 text-app-text-primary font-black flex items-center justify-center text-sm shadow-md shrink-0 select-none">
                        {getBusinessInitials(business.name)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-black text-app-text-primary text-sm tracking-tight flex items-center gap-2">
                          <span className="truncate">{business.name}</span>
                          <span className="text-[8px] bg-app-bg border border-app-border text-app-text-secondary px-1.5 py-0.5 rounded font-bold shrink-0">
                            ID: {business.id}
                          </span>
                        </h4>
                        <p className="text-[11px] text-app-text-secondary mt-0.5 truncate">
                          Mobile: {business.mobile || 'Not set'} • {business.staffCount} staff member{business.staffCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditBusiness(business)}
                        title="Edit business"
                        className="w-8 h-8 rounded-full bg-app-bg border border-app-border text-app-text-secondary hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBusiness(business)}
                        disabled={isOwnBusiness}
                        title={isOwnBusiness ? 'You cannot delete your own business' : 'Delete business'}
                        className={`w-8 h-8 rounded-full bg-app-bg border border-app-border text-app-text-secondary flex items-center justify-center transition-all ${
                          isOwnBusiness ? 'opacity-40 cursor-not-allowed' : 'hover:text-rose-500 hover:border-rose-300 cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Users list */}
                  <div className="divide-y divide-app-border/40">
                    {business.users.length === 0 && (
                      <div className="p-4 text-[11px] text-app-text-secondary font-semibold">
                        No login users in this business.
                      </div>
                    )}
                    {business.users.map((user) => {
                      const isSelf = currentUser?.id === user.id;
                      return (
                        <div key={user.id} className="p-4 px-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              user.isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-slate-100 dark:bg-slate-800 text-app-text-secondary'
                            }`}>
                              <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>person</span>
                            </div>
                            <div className="overflow-hidden">
                              <h5 className="font-bold text-app-text-primary text-xs flex items-center gap-1.5 truncate">
                                {user.name}
                                {isSelf && (
                                  <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-black shrink-0">
                                    You
                                  </span>
                                )}
                                {!user.isActive && (
                                  <span className="text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded uppercase font-black shrink-0">
                                    Login Off
                                  </span>
                                )}
                              </h5>
                              <p className="text-[10px] text-app-text-secondary mt-0.5 truncate">
                                {[user.mobile, user.email].filter(Boolean).join(' • ') || 'No login id'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Edit / Delete user */}
                            <button
                              onClick={() => openEditUser(business.id, user)}
                              title="Edit user"
                              className="w-7 h-7 rounded-full bg-app-bg border border-app-border text-app-text-secondary hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <span className="material-symbols-rounded select-none" style={{ fontSize: '13px' }}>edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(business.id, user)}
                              disabled={isSelf}
                              title={isSelf ? 'You cannot delete your own login' : 'Delete user'}
                              className={`w-7 h-7 rounded-full bg-app-bg border border-app-border text-app-text-secondary flex items-center justify-center transition-all ${
                                isSelf ? 'opacity-40 cursor-not-allowed' : 'hover:text-rose-500 hover:border-rose-300 cursor-pointer'
                              }`}
                            >
                              <span className="material-symbols-rounded select-none" style={{ fontSize: '13px' }}>delete</span>
                            </button>

                            {/* Login on/off toggle */}
                            <button
                              type="button"
                              disabled={isSelf}
                              title={isSelf ? 'You cannot disable your own login' : 'Toggle login access'}
                              onClick={() => handleToggleUser(business.id, user.id, !user.isActive)}
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-1 ${
                                user.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                              } ${isSelf ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  user.isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {businesses.length === 0 && !error && (
            <div className="bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
              <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">store</span>
              <p className="mt-2 text-sm font-semibold">No businesses found.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Business Dialog */}
      {editBusiness && (
        <CustomDialog
          isOpen={!!editBusiness}
          onClose={() => setEditBusiness(null)}
          title="Edit Business"
          actions={
            <>
              <button
                onClick={() => setEditBusiness(null)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBusiness}
                disabled={bizSaving}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-primary/10 disabled:opacity-60"
              >
                {bizSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveBusiness} className="flex flex-col gap-4">
            {bizError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs border border-red-200">
                {bizError}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Business Name</label>
              <input type="text" value={bizName} onChange={(e) => setBizName(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Business Mobile</label>
              <input
                type="tel"
                value={bizMobile}
                onChange={(e) => setBizMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Business Address</label>
              <textarea
                rows={2}
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
                className={`${inputClass} resize-none`}
              />
            </div>
          </form>
        </CustomDialog>
      )}

      {/* Edit User Dialog */}
      {editUser && (
        <CustomDialog
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          title="Edit Login User"
          actions={
            <>
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={userSaving}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-primary/10 disabled:opacity-60"
              >
                {userSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveUser} className="flex flex-col gap-4">
            {userError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs border border-red-200">
                {userError}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Full Name</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Login Mobile</label>
                <input
                  type="tel"
                  value={userMobile}
                  onChange={(e) => setUserMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Login Email</label>
                <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Leave blank to keep"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>New PIN</label>
                <input
                  type="tel"
                  value={userPin}
                  onChange={(e) => setUserPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Leave blank to keep"
                  className={inputClass}
                />
              </div>
            </div>
          </form>
        </CustomDialog>
      )}
    </div>
  );
};
