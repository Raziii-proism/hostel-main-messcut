import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      {message && <p className="text-sm text-slate-500">{message}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Loader2;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-xs text-xs text-slate-500">{description}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
      <p className="text-sm font-medium text-rose-700">{message}</p>
    </div>
  );
}
