import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  listBusinessesRequest,
  toggleUserActiveRequest,
  type BusinessAccount,
} from '../api/client';

export const BusinessesScreen: React.FC = () => {
  const { setScreen, currentUser } = useStore();

  const [businesses, setBusinesses] = useState<BusinessAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    // Optimistic flip; reload from server if it fails.
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
          {businesses.map((business) => (
            <div
              key={business.id}
              className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
            >
              <div className="bg-app-surface border border-app-border/40 rounded-[18px] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                {/* Business header */}
                <div className="p-5 flex items-center justify-between gap-4 border-b border-app-border/40">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-accent/30 to-emerald-500 text-app-text-primary font-black flex items-center justify-center text-sm shadow-md shrink-0 select-none">
                      {getBusinessInitials(business.name)}
                    </div>
                    <div>
                      <h4 className="font-black text-app-text-primary text-sm tracking-tight flex items-center gap-2">
                        {business.name}
                        <span className="text-[8px] bg-app-bg border border-app-border text-app-text-secondary px-1.5 py-0.5 rounded font-bold">
                          ID: {business.id}
                        </span>
                      </h4>
                      <p className="text-[11px] text-app-text-secondary mt-0.5">
                        Mobile: {business.mobile || 'Not set'} • {business.staffCount} staff member{business.staffCount === 1 ? '' : 's'}
                      </p>
                    </div>
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

                        {/* Login on/off toggle */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`text-[9px] font-black uppercase tracking-wider ${
                            user.isActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-app-text-secondary'
                          }`}>
                            {user.isActive ? 'Login On' : 'Login Off'}
                          </span>
                          <button
                            type="button"
                            disabled={isSelf}
                            title={isSelf ? 'You cannot disable your own login' : 'Toggle login access'}
                            onClick={() => handleToggleUser(business.id, user.id, !user.isActive)}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
          ))}

          {businesses.length === 0 && !error && (
            <div className="bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
              <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">store</span>
              <p className="mt-2 text-sm font-semibold">No businesses found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
