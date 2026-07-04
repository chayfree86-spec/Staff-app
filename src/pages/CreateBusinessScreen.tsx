import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { registerBusinessRequest } from '../api/client';

export const CreateBusinessScreen: React.FC = () => {
  const { setScreen } = useStore();

  const [businessName, setBusinessName] = useState('');
  const [businessMobile, setBusinessMobile] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setBusinessName('');
    setBusinessMobile('');
    setBusinessAddress('');
    setUserName('');
    setUserMobile('');
    setUserEmail('');
    setPassword('');
    setConfirmPassword('');
    setPin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    if (!businessName.trim()) {
      setError('Please enter the business name.');
      return;
    }
    if (!userName.trim()) {
      setError("Please enter the admin user's name.");
      return;
    }
    if (!userMobile.trim() && !userEmail.trim()) {
      setError('Enter user mobile or email — it is needed for login.');
      return;
    }
    if (userMobile.trim() && userMobile.trim().length !== 10) {
      setError('User mobile must be exactly 10 digits.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (pin.trim() && (pin.trim().length < 4 || pin.trim().length > 6)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await registerBusinessRequest({
        businessName: businessName.trim(),
        businessMobile: businessMobile.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        userName: userName.trim(),
        userMobile: userMobile.trim() || undefined,
        userEmail: userEmail.trim() || undefined,
        password,
        pin: pin.trim() || undefined,
      });
      setSuccess(
        `Business "${businessName.trim()}" created. ${userName.trim()} can now log in with their ${userMobile.trim() ? 'mobile number' : 'email'} and password.`
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-app-bg border border-app-border rounded-app-card text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary font-medium';
  const labelClass = 'text-xs font-semibold text-app-text-secondary uppercase';

  return (
    <div className="flex flex-col gap-4 pb-24 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('businesses')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <h2 className="text-base font-bold text-app-text-primary">Create New Business</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl mx-auto w-full">
        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 rounded-app-card text-xs font-semibold border border-emerald-200 flex items-center gap-2">
            <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>check_circle</span>
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs font-semibold border border-red-200 flex items-center gap-2">
            <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>error</span>
            {error}
          </div>
        )}

        {/* Business details */}
        <div className="bg-app-surface p-5 rounded-app-card border border-app-border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>add_business</span>
            </div>
            <div>
              <h3 className="font-bold text-app-text-primary text-sm">Business Details</h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                A separate business with its own staff, attendance and salary data.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Business Name *</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Chaupal Restaurant"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Business Mobile</label>
              <input
                type="tel"
                value={businessMobile}
                onChange={(e) => setBusinessMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Business Address</label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Complete physical address"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Admin user details */}
        <div className="bg-app-surface p-5 rounded-app-card border border-app-border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>person_add</span>
            </div>
            <div>
              <h3 className="font-bold text-app-text-primary text-sm">Admin User (Login)</h3>
              <p className="text-[11px] text-app-text-secondary mt-0.5">
                This user will log in and manage the new business. Mobile or email is required.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Full Name *</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Login Mobile</label>
              <input
                type="tel"
                value={userMobile}
                onChange={(e) => setUserMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Login Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="name@example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Quick Login PIN (Optional)</label>
            <input
              type="tel"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="4 to 6 digit PIN"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-primary text-white text-xs font-bold rounded-app-card hover:bg-opacity-95 shadow-md shadow-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Business...' : 'Create Business & Admin User'}
        </button>
      </form>
    </div>
  );
};
