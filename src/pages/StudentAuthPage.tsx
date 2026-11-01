import { useState } from 'react';
import { GraduationCap, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ErrorBanner } from '@/components/Feedback';

type StudentAuthPageProps = {
  onBack: () => void;
  onSuccess: () => void;
};

export function StudentAuthPage({ onBack, onSuccess }: StudentAuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      onSuccess();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Invalid login')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 px-6 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={18} /> Back to Home
        </button>

        <div className="mb-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/25">
            <GraduationCap className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Student Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with the account your warden created for you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label-text">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
          <p className="text-xs text-teal-700">
            Don't have an account? Ask your warden to add you — students are registered by their warden.
          </p>
        </div>
      </div>
    </div>
  );
}
