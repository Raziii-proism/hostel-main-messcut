import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LandingPage } from '@/pages/LandingPage';
import { WardenAuthPage } from '@/pages/WardenAuthPage';
import { StudentAuthPage } from '@/pages/StudentAuthPage';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { WardenDashboard } from '@/pages/WardenDashboard';
import { AdminPage } from '@/pages/AdminPage';
import { EntriesPage } from '@/pages/EntriesPage';
import { LoadingSpinner } from '@/components/Feedback';

type AuthScreen = 'landing' | 'warden' | 'student' | 'admin' | 'entries';

function AppContent() {
  const { user, role, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // If user is logged in, show the appropriate dashboard
  if (user && role === 'warden') {
    return <WardenDashboard />;
  }
  if (user && role === 'student') {
    return <StudentDashboard />;
  }

  // If user is logged in but has no role, sign them out and show landing
  // Otherwise show auth screens
  switch (authScreen) {
    case 'warden':
      return <WardenAuthPage onBack={() => setAuthScreen('landing')} onSuccess={() => {}} />;
    case 'student':
      return <StudentAuthPage onBack={() => setAuthScreen('landing')} onSuccess={() => {}} />;
    case 'admin':
      return <AdminPage onBack={() => setAuthScreen('landing')} />;
    case 'entries':
      return <EntriesPage onBack={() => setAuthScreen('landing')} />;
    default:
      return (
        <LandingPage
          onSelectWarden={() => setAuthScreen('warden')}
          onSelectStudent={() => setAuthScreen('student')}
          onSelectAdmin={() => setAuthScreen('admin')}
          onSelectEntries={() => setAuthScreen('entries')}
        />
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
