import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Hostel, UserRole, Student, Warden } from '@/lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: UserRole;
  hostel: Hostel | null;
  student: Student | null;
  warden: Warden | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [warden, setWarden] = useState<Warden | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(currentUser: User) {
    // Check if warden
    const { data: wardenRow } = await supabase
      .from('wardens')
      .select('id, hostel_id, created_at')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (wardenRow) {
      setRole('warden');
      setWarden(wardenRow as Warden);
      setStudent(null);
      const { data: hostelRow } = await supabase
        .from('hostels')
        .select('*')
        .eq('id', (wardenRow as Warden).hostel_id)
        .maybeSingle();
      setHostel(hostelRow as Hostel);
      return;
    }

    // Check if student
    const { data: studentRow } = await supabase
      .from('students')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (studentRow) {
      setRole('student');
      setStudent(studentRow as Student);
      setWarden(null);
      const { data: hostelRow } = await supabase
        .from('hostels')
        .select('*')
        .eq('id', (studentRow as Student).hostel_id)
        .maybeSingle();
      setHostel(hostelRow as Hostel);
      return;
    }

    setRole(null);
    setHostel(null);
    setStudent(null);
    setWarden(null);
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        (async () => {
          await loadProfile(s.user);
          setLoading(false);
        })();
      } else {
        setRole(null);
        setHostel(null);
        setStudent(null);
        setWarden(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setRole(null);
    setHostel(null);
    setStudent(null);
    setWarden(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, user, role, hostel, student, warden, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
