import { useState } from 'react';
import { ChevronLeft, KeyRound, UserPlus, CheckCircle2 } from 'lucide-react';
import { ErrorBanner } from '@/components/Feedback';

type AdminPageProps = {
  onBack: () => void;
};

export function AdminPage({ onBack }: AdminPageProps) {
  const [adminKey, setAdminKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-warden`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ adminKey, email, password, hostelName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create warden');
      }

      setSuccess(`Warden account created for ${email}. They can now sign in.`);
      setEmail('');
      setPassword('');
      setHostelName('');
    } catch (err) {
      setError((err as Error).message);
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
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
            <KeyRound className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create warden accounts. Only the app owner has access.
          </p>
        </div>

        {success && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Admin Key</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter your admin key"
              className="input-field"
              required
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UserPlus size={16} /> New Warden Details
            </p>

            <div className="space-y-4">
              <div>
                <label className="label-text">Hostel Name</label>
                <input
                  type="text"
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  placeholder="e.g. Block A Hostel"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-text">Warden Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warden@example.com"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-text">Warden Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set a password for the warden"
                  className="input-field"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating...' : 'Create Warden Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
