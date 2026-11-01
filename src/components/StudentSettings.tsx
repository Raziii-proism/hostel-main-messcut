import { UserCircle, LogOut, Building2, DoorOpen, Phone, Clock } from 'lucide-react';
import type { Student, Hostel } from '@/lib/supabase';

type StudentSettingsProps = {
  student: Student;
  hostel: Hostel;
  onSignOut: () => void;
};

export function StudentSettings({ student, hostel, onSignOut }: StudentSettingsProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Settings</h2>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <UserCircle className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{student.full_name}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow icon={Building2} label="Hostel" value={hostel?.name || '-'} />
          <InfoRow icon={DoorOpen} label="Room No" value={student.room_no || '-'} />
          <InfoRow icon={Phone} label="Phone" value={student.phone || '-'} />
        </div>
      </div>

      {/* Hostel info */}
      <div className="card">
        <p className="text-sm font-bold text-slate-900 mb-3">Hostel Settings</p>
        <div className="space-y-3">
          <InfoRow icon={Clock} label="Absence Cutoff" value="12:10 PM" />
        </div>
      </div>

      {/* Sign out */}
      <button onClick={onSignOut} className="btn-secondary w-full text-rose-600 hover:bg-rose-50 border-rose-200">
        <LogOut size={18} />
        Sign Out
      </button>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
