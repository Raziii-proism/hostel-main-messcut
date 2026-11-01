import { ShieldCheck, Building2, LogOut, Clock } from 'lucide-react';
import type { Hostel } from '@/lib/supabase';

type WardenSettingsProps = {
  hostel: Hostel;
  onSignOut: () => void;
  onDataChange: () => void;
};

export function WardenSettings({ hostel, onSignOut }: WardenSettingsProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-900">Settings</h2>

      {/* Warden profile */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <ShieldCheck className="h-8 w-8 text-teal-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Warden</p>
            <p className="text-xs text-slate-500">{hostel.name}</p>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow icon={Building2} label="Hostel" value={hostel.name} />
        </div>
      </div>

      {/* Attendance cutoff info (fixed) */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <Clock className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Attendance Cutoff</p>
            <p className="text-xs text-slate-500">
              Fixed at <span className="font-semibold text-slate-700">12:10 PM</span>. Students must mark absence before 12:10 PM on the previous day.
            </p>
          </div>
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
