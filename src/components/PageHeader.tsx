import { ChevronLeft } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
};

export function PageHeader({ title, subtitle, onBack, rightAction }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-slate-100">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {rightAction}
      </div>
    </div>
  );
}
