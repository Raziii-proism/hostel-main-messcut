import { Home, Calendar, Receipt, Settings, Users, PieChart } from 'lucide-react';

type Tab = {
  id: string;
  label: string;
  icon: typeof Home;
};

type BottomNavProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: Tab[];
};

const defaultStudentTabs: Tab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'fees', label: 'Fees', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const defaultWardenTabs: Tab[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'fees', label: 'Fees', icon: Receipt },
  { id: 'analytics', label: 'Stats', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function StudentBottomNav({ activeTab, onTabChange }: Omit<BottomNavProps, 'tabs'>) {
  return <BottomNav activeTab={activeTab} onTabChange={onTabChange} tabs={defaultStudentTabs} />;
}

export function WardenBottomNav({ activeTab, onTabChange }: Omit<BottomNavProps, 'tabs'>) {
  return <BottomNav activeTab={activeTab} onTabChange={onTabChange} tabs={defaultWardenTabs} />;
}

function BottomNav({ activeTab, onTabChange, tabs = [] }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                  isActive ? 'bg-teal-50 scale-110' : 'scale-100'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[11px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
