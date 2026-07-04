import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { format, parseISO } from 'date-fns';
import { useAlertConfirm } from '../components/ui/AlertConfirmProvider';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';

export const StaffScreen: React.FC = () => {
  const {
    staffList,
    attendance,
    payoutList,
    advanceList,
    deductionList,
    addStaff,
    updateStaff,
    deleteStaff,
    setScreen,
    setActiveStaffProfileId,
    currentDate,
    isAddStaffModalOpen,
    setIsAddStaffModalOpen,
  } = useStore();

  const { alert } = useAlertConfirm();

  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form states - Add Staff
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile2, setMobile2] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [salary, setSalary] = useState('');
  const [salaryType, setSalaryType] = useState('Monthly');
  const [basis, setBasis] = useState('Attendance Based');
  const [error, setError] = useState('');

  // Form states - Edit Staff
  const [editStaffId, setEditStaffId] = useState('');
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editMobile2, setEditMobile2] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editSalaryType, setEditSalaryType] = useState('Monthly');
  const [editBasis, setEditBasis] = useState('Attendance Based');
  const [editError, setEditError] = useState('');

  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  const currentYearMonth = currentDate.slice(0, 7); // YYYY-MM
  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const filteredStaff = staffList.filter((staff) =>
    staff.name.toLowerCase().includes(search.toLowerCase())
  );

  const getMonthlyEarnedSalary = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return 0;

    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr.startsWith(currentYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const perDayVal = staff.perDaySalary;
    const totalDaysCredited = daysPresent + (daysHalf * 0.5) + daysHoliday;
    return Math.round(totalDaysCredited * perDayVal);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      await alert('Please enter the employee\'s Full Name.', {
        title: 'Validation Failed',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }
    if (!salary.trim()) {
      await alert('Please enter the Monthly / Daily Salary Base.', {
        title: 'Validation Failed',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }
    if (mobile.trim() && mobile.length < 10) {
      await alert('Mobile number must be at least 10 digits.', {
        title: 'Validation Failed',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }
    setError('');
    addStaff({
      name,
      mobile,
      monthlySalary: Number(salary),
      salaryType: salaryType as 'Monthly' | 'Daily',
      calculationBasis: basis as 'Attendance Based' | 'Fixed Salary',
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      status: 'Active',
      fatherName: fatherName.trim() || undefined,
      mobile2: mobile2.trim() || undefined,
      address: address.trim() || undefined,
      profileImage: profileImage || undefined,
    });
    // Reset form
    setName('');
    setMobile('');
    setFatherName('');
    setMobile2('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setAddress('');
    setProfileImage('');
    setSalary('');
    setIsAddStaffModalOpen(false);
  };

  const handleOpenEdit = (staff: any) => {
    setEditStaffId(staff.id);
    setEditName(staff.name);
    setEditMobile(staff.mobile);
    setEditFatherName(staff.fatherName || '');
    setEditMobile2(staff.mobile2 || '');
    setEditJoiningDate(staff.joiningDate || '');
    setEditAddress(staff.address || '');
    setEditProfileImage(staff.profileImage || '');
    setEditSalary(String(staff.monthlySalary));
    setEditSalaryType(staff.salaryType);
    setEditBasis(staff.calculationBasis);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      await alert('Please enter the employee\'s Full Name.', {
        title: 'Validation Failed',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }
    if (!editSalary.trim()) {
      await alert('Please enter the Monthly / Daily Salary Base.', {
        title: 'Validation Failed',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }
    if (editMobile.trim() && editMobile.length < 10) {
      await alert('Mobile number must be at least 10 digits.', {
        title: 'Validation Failed',
        type: 'warning',
        confirmText: 'OK'
      });
      return;
    }
    setEditError('');
    updateStaff(editStaffId, {
      name: editName,
      mobile: editMobile,
      monthlySalary: Number(editSalary),
      salaryType: editSalaryType as 'Monthly' | 'Daily',
      calculationBasis: editBasis as 'Attendance Based' | 'Fixed Salary',
      fatherName: editFatherName.trim() || undefined,
      mobile2: editMobile2.trim() || undefined,
      joiningDate: editJoiningDate || undefined,
      address: editAddress.trim() || undefined,
      profileImage: editProfileImage || undefined,
    });
    setIsEditModalOpen(false);
  };

  const handleOpenDeleteConfirm = (staff: any) => {
    setStaffToDelete({ id: staff.id, name: staff.name });
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteStaff = () => {
    if (staffToDelete) {
      deleteStaff(staffToDelete.id);
      setIsDeleteConfirmOpen(false);
      setStaffToDelete(null);
    }
  };

  const getStaffRole = (staff: { salaryType: string; calculationBasis: string }) =>
    `${staff.salaryType} • ${staff.calculationBasis}`;

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

  const getStripGradient = (name: string) => {
    const gradients = [
      'from-indigo-600 to-purple-600 text-white',
      'from-emerald-600 to-teal-600 text-white',
      'from-rose-600 to-orange-500 text-white',
      'from-blue-600 to-indigo-600 text-white',
      'from-amber-500 to-rose-600 text-white',
      'from-violet-600 to-fuchsia-600 text-white',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  return (
    <div className="flex flex-col gap-5 pb-44 animate-in fade-in duration-200">
      
      {/* Title bar: Heading and Add Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 select-none text-left">
          <h2 className="text-xl font-extrabold text-app-text-primary tracking-tight">Staff Directory</h2>
          <p className="text-xs text-app-text-secondary font-medium">Add new staff members, manage profiles, and salary parameters.</p>
        </div>
        <button
          onClick={() => setIsAddStaffModalOpen(true)}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border flex items-center justify-center text-app-text-primary shadow-sm hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shrink-0 mt-0.5"
        >
          <span className="material-symbols-rounded select-none text-[20px]">add</span>
        </button>
      </div>

      {/* Staff list cards grid (Halved radius: 2.5rem -> 1.25rem, inner core: calc(2.5rem-0.25rem) i.e. 36px -> 18px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStaff.map((staff) => {
          const earnedSalary = getMonthlyEarnedSalary(staff.id);
          const initials = staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          
          return (
            <div
              key={staff.id}
              onClick={() => {
                setActiveStaffProfileId(staff.id);
                setScreen('staff-profile');
              }}
              className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1 shadow-sm"
            >
              <div className="bg-app-surface border border-app-border/40 rounded-[18px] overflow-hidden flex flex-col justify-between hover:border-primary/20 dark:hover:border-primary/40 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 cursor-pointer group">
                
                {/* Top part: Avatar, Info, Earned Salary */}
                <div className="flex items-center justify-between p-4 pb-3">
                  <div className="flex items-center gap-3">
                    {staff.profileImage ? (
                      <img
                        src={staff.profileImage}
                        alt={staff.name}
                        className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border border-app-border/40"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 border-0`}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-app-text-primary text-xs leading-none flex items-center gap-1.5 group-hover:text-primary transition-colors">
                        {staff.name}
                        {staff.status === 'Inactive' && (
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-app-text-secondary px-1.5 py-0.5 rounded uppercase font-semibold">
                            Inactive
                          </span>
                        )}
                      </h4>
                      <p className="text-[9px] font-semibold text-app-text-secondary mt-1.5 leading-none">
                        {getStaffRole(staff)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-500 leading-none">
                      ₹{earnedSalary.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[7.5px] text-app-text-secondary font-bold uppercase tracking-wider mt-1 leading-none">
                      earned
                    </div>
                  </div>
                </div>

                {/* Bottom part: Monthly, Per day rate columns, circle icon */}
                <div className={`border-t border-app-border grid grid-cols-3 items-center p-3 px-4 bg-gradient-to-r ${getStripGradient(staff.name)}`}>
                  <div>
                    <div className="text-[8px] text-white/75 font-bold uppercase tracking-wider leading-none">Monthly</div>
                    <div className="text-xs font-bold text-white mt-1.5 leading-none">
                      ₹{staff.monthlySalary.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-white/75 font-bold uppercase tracking-wider leading-none">Per day</div>
                    <div className="text-xs font-bold text-white mt-1.5 leading-none">
                      ₹{staff.perDaySalary.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex justify-end col-span-1">
                    <a
                      href={`tel:${staff.mobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-7 h-7 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      title="Call Staff"
                    >
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>call</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* "Add New Staff" Card - styled like a staff card */}
        <div
          onClick={() => setIsAddStaffModalOpen(true)}
          className="bg-black/[0.015] dark:bg-white/[0.015] border border-dashed border-app-border hover:border-primary/50 dark:hover:border-primary/70 rounded-[1.25rem] p-1 shadow-sm transition-all duration-300 active:scale-98 cursor-pointer group"
        >
          <div className="h-full min-h-[110px] bg-app-surface/50 border border-dashed border-app-border/60 rounded-[18px] flex flex-col items-center justify-center py-6 px-5 hover:bg-app-surface transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] text-app-text-secondary hover:text-primary">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A855F7]/10 to-[#7C3AED]/10 text-primary flex items-center justify-center shadow-sm shrink-0 border border-primary/20 group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-rounded select-none text-xl">person_add</span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider mt-3 select-none leading-none">
              Add New Staff
            </span>
            <p className="text-[9px] text-app-text-secondary/70 font-semibold mt-1.5 select-none leading-none">
              Register another employee
            </p>
          </div>
        </div>

        {filteredStaff.length === 0 && (
          <div className="col-span-full bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
            <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">
              group
            </span>
            <p className="mt-2 text-sm font-semibold">No staff members found.</p>
          </div>
        )}
      </div>

      {/* Search Bar - Double Bezel Look (Fixed position above bottom menu bar) */}
      <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 bg-app-surface/90 backdrop-blur-md border-t border-app-border p-4 z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] select-none">
        <div className="max-w-md mx-auto bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1">
          <div className="relative bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)]">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search staff members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Add Staff Dialog */}
      {isAddStaffModalOpen && (
        <CustomDialog
          isOpen={isAddStaffModalOpen}
          onClose={() => setIsAddStaffModalOpen(false)}
          title="Register New Staff Member"
          actions={
            <>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-primary/10"
              >
                Add Staff
              </button>
            </>
          }
        >
          <form onSubmit={handleAddStaff} className="flex flex-col gap-4">
            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {error}
              </div>
            )}
            
            {/* Profile Photo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Profile Photo</label>
              <div className="flex items-center gap-3">
                {profileImage ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-app-border">
                    <img src={profileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setProfileImage('')}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="w-12 h-12 rounded-full bg-app-bg border border-dashed border-app-border flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-all text-app-text-secondary">
                    <span className="material-symbols-rounded text-lg">add_a_photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                <span className="text-[10px] text-app-text-secondary font-medium">Upload employee photo (JPEG, PNG)</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Father's Name</label>
              <input
                type="text"
                placeholder="Enter staff full name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Primary Mobile</label>
                <input
                  type="tel"
                  placeholder="Primary 10-digit number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Secondary Mobile</label>
                <input
                  type="tel"
                  placeholder="Optional 10-digit number"
                  value={mobile2}
                  onChange={(e) => setMobile2(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Joining Date</label>
              <CustomDatePicker
                value={joiningDate}
                onChange={(val) => setJoiningDate(val)}
                className="w-full"
                inline
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Address</label>
              <textarea
                placeholder="Residential Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Salary Type"
                value={salaryType}
                onChange={setSalaryType}
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Daily', label: 'Daily' },
                ]}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Monthly / Daily Base</label>
                <input
                  type="number"
                  placeholder="₹"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary no-spinners transition-all"
                />
              </div>
            </div>

            <CustomSelect
              label="Salary Calculation Basis"
              value={basis}
              onChange={setBasis}
              options={[
                { value: 'Attendance Based', label: 'Attendance Based' },
                { value: 'Fixed Salary', label: 'Fixed Salary' },
              ]}
            />
          </form>
        </CustomDialog>
      )}

      {/* Edit Staff Dialog */}
      {isEditModalOpen && (
        <CustomDialog
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Staff Member details"
          actions={
            <>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStaff}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-primary/10"
              >
                Save Changes
              </button>
            </>
          }
        >
          <form onSubmit={handleEditStaff} className="flex flex-col gap-4">
            {editError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {editError}
              </div>
            )}
            {/* Profile Photo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Profile Photo</label>
              <div className="flex items-center gap-3">
                {editProfileImage ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-app-border">
                    <img src={editProfileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditProfileImage('')}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="w-12 h-12 rounded-full bg-app-bg border border-dashed border-app-border flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-all text-app-text-secondary">
                    <span className="material-symbols-rounded text-lg">add_a_photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditProfileImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                <span className="text-[10px] text-app-text-secondary font-medium">Upload employee photo (JPEG, PNG)</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Father's Name</label>
              <input
                type="text"
                placeholder="Enter staff full name"
                value={editFatherName}
                onChange={(e) => setEditFatherName(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Primary Mobile</label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Secondary Mobile</label>
                <input
                  type="tel"
                  placeholder="Optional 10-digit number"
                  value={editMobile2}
                  onChange={(e) => setEditMobile2(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Joining Date</label>
              <CustomDatePicker
                value={editJoiningDate}
                onChange={(val) => setEditJoiningDate(val)}
                className="w-full"
                inline
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Address</label>
              <textarea
                placeholder="Residential Address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Salary Type"
                value={editSalaryType}
                onChange={setEditSalaryType}
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Daily', label: 'Daily' },
                ]}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Monthly / Daily Base</label>
                <input
                  type="number"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners transition-all"
                />
              </div>
            </div>

            <CustomSelect
              label="Salary Calculation Basis"
              value={editBasis}
              onChange={setEditBasis}
              options={[
                { value: 'Attendance Based', label: 'Attendance Based' },
                { value: 'Fixed Salary', label: 'Fixed Salary' },
              ]}
            />
          </form>
        </CustomDialog>
      )}

      {/* Delete Staff Dialog */}
      {isDeleteConfirmOpen && (
        <CustomDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          title="Delete Staff Member"
          actions={
            <>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-rose-500/10"
              >
                Delete Staff
              </button>
            </>
          }
        >
          <p className="text-sm text-app-text-secondary leading-relaxed">
            Are you sure you want to permanently delete <strong>{staffToDelete?.name}</strong> from the system?
            This action cannot be undone and will delete all their historical records.
          </p>
        </CustomDialog>
      )}
    </div>
  );
};
