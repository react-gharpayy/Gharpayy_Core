'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const r = await fetch('/api/auth/request-password-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, text: d.error || 'Request failed' });
      } else {
        setMsg({ ok: true, text: 'Request sent for admin approval' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="ARENA OS" className="h-10 w-auto" onError={e => { (e.target as any).style.display='none'; }} />
          <div className="text-center">
            <div className="text-base font-bold text-gray-900">Gharpayy</div>
            <div className="text-sm font-bold text-orange-500">ARENA OS</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Reset Password</h2>
          <p className="text-sm text-gray-700 mb-6">Submit a new password for admin approval</p>

          {msg && (
            <div className={`flex items-start gap-2 border text-sm rounded-2xl p-3.5 mb-5 ${
              msg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {msg.ok ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="********"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-60">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <button onClick={() => router.push('/login')}
          className="w-full mt-4 text-xs text-gray-700 hover:text-orange-500">
          Back to Sign In
        </button>
      </div>
    </div>
  );
}

