import React, { useState } from 'react';
import { useStore } from '../store/useStore';

export const BusinessScreen: React.FC = () => {
  const { businessInfo, updateBusinessInfo, setScreen } = useStore();

  const [name, setName] = useState(businessInfo.name);
  const [mobile, setMobile] = useState(businessInfo.mobile);
  const [address, setAddress] = useState(businessInfo.address);
  const [logo, setLogo] = useState(businessInfo.logo || '');
  const [saveStatus, setSaveStatus] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      window.alert("Image size should not exceed 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogo('');
    const input = document.getElementById('store-logo-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessInfo({ name, mobile, address, logo });
    setSaveStatus(true);
    setTimeout(() => {
      setSaveStatus(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4 pb-24 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => setScreen('more')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:bg-slate-50 transition-colors shrink-0 mt-0.5"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <div className="flex flex-col gap-1 select-none text-left">
          <h2 className="text-xl font-extrabold text-app-text-primary tracking-tight">Business Profile</h2>
          <p className="text-xs text-app-text-secondary font-medium">Update store name, contact number, address, and upload logo.</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-app-surface p-5 rounded-app-card border border-app-border shadow-sm flex flex-col gap-4 max-w-xl mx-auto w-full">
        {saveStatus && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 rounded-app-card text-xs font-semibold border border-emerald-200 flex items-center gap-2">
            <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>check_circle</span>
            Business profile updated successfully
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Logo upload display */}
          <div className="flex flex-col items-center gap-2 py-2">
            <input
              type="file"
              id="store-logo-input"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <div className="relative group">
              <div 
                onClick={() => document.getElementById('store-logo-input')?.click()}
                className="w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-primary/15 transition-all overflow-hidden"
              >
                {logo ? (
                  <img src={logo} alt="Store Logo" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '30px' }}>storefront</span>
                    <span className="text-[10px] font-bold mt-1">Upload</span>
                  </>
                )}
              </div>
              
              {logo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md border border-white hover:bg-rose-600 transition-colors cursor-pointer select-none"
                >
                  <span className="material-symbols-rounded select-none text-[14px]">close</span>
                </button>
              )}
            </div>
            <span className="text-[11px] text-app-text-secondary">Store Logo (Square image, max 2MB)</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter business name"
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-app-card text-sm text-app-text-primary focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Contact Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-app-card text-sm text-app-text-primary focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Store Address</label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Complete physical address..."
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-app-card text-sm text-app-text-primary focus:outline-none focus:border-primary font-medium resize-none leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-white text-xs font-bold rounded-app-card hover:bg-opacity-95 shadow-md shadow-primary/10 mt-2"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};
