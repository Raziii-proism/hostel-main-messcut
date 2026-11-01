import { UtensilsCrossed, ShieldCheck, GraduationCap, ChevronRight, KeyRound, ClipboardList } from 'lucide-react';

type LandingPageProps = {
  onSelectWarden: () => void;
  onSelectStudent: () => void;
  onSelectAdmin: () => void;
  onSelectEntries: () => void;
};

export function LandingPage({ onSelectWarden, onSelectStudent, onSelectAdmin, onSelectEntries }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 flex flex-col relative">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 animate-scale-in">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-2xl">
            <UtensilsCrossed className="h-12 w-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-white animate-slide-up">
          HOSTEL
        </h1>
        <h1 className="text-5xl font-extrabold tracking-tight text-amber-300 animate-slide-up -mt-1">
          MESS CUT
        </h1>

        <p className="mt-4 max-w-xs text-sm text-teal-100 animate-slide-up">
          Track your mess attendance, manage absences, and pay monthly bills — all in one place.
        </p>
      </div>

      {/* Login options */}
      <div className="px-6 pb-24 animate-slide-up">
        <div className="mx-auto max-w-md space-y-3">
          <p className="mb-4 text-center text-sm font-medium text-teal-100">Login as</p>

          <button
            onClick={onSelectWarden}
            className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50">
              <ShieldCheck className="h-7 w-7 text-teal-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-bold text-slate-900">Warden</p>
              <p className="text-xs text-slate-500">Manage students, fees & attendance</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-teal-500 transition-colors" />
          </button>

          <button
            onClick={onSelectStudent}
            className="group flex w-full items-center gap-4 rounded-2xl bg-white p-4 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50">
              <GraduationCap className="h-7 w-7 text-amber-500" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-bold text-slate-900">Student</p>
              <p className="text-xs text-slate-500">Mark attendance & pay mess bills</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </button>
        </div>

        {/* Admin link */}
        <div className="mx-auto mt-6 max-w-md text-center">
          <button
            onClick={onSelectAdmin}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-200/70 hover:text-teal-100 transition-colors"
          >
            <KeyRound size={14} /> Admin Access
          </button>
        </div>
      </div>

      {/* Entries button - floating bottom left */}
      <button
        onClick={onSelectEntries}
        className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-2xl shadow-teal-900/30 text-teal-600 transition-all hover:bg-teal-50 hover:scale-110 active:scale-95 animate-slide-up"
        aria-label="Entries"
      >
        <ClipboardList className="h-6 w-6" strokeWidth={2.5} />
      </button>
    </div>
  );
}
