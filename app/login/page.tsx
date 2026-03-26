'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password) { setError('Please enter your password'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) data = await res.json();

      if (!res.ok) {
        if (res.status === 401) setError('Wrong email or password. Please try again.');
        else if (res.status === 404) setError('Login API route not found. Restart the app server on port 3005.');
        else setError(data?.error || 'Login failed. Please try again.');
        return;
      }

      if (data.user?.role === 'admin' || data.user?.role === 'manager') router.push('/');
      else router.push('/home');
    } catch {
      setError('Unable to reach login service. Please restart the app server and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="ARENA OS" className="h-10 w-auto" onError={e => { (e.target as any).style.display = 'none'; }} />
          <div className="text-center">
            <div className="text-base font-bold text-gray-900">Gharpayy</div>
            <div className="text-sm font-bold text-orange-500">ARENA OS</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-700 mb-6">Sign in to mark your attendance</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-3.5 mb-5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@arenaos.com"
                autoComplete="email"
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="********"
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition disabled:opacity-60 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
          <div className="mt-3 text-right">
            <a href="/forgot-password" className="text-xs text-orange-500 hover:underline font-semibold">Forgot Password?</a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Gharpayy - ARENA OS - {new Date().getFullYear()}</p>
        <p className="text-center text-xs text-gray-700 mt-3">New to ARENA OS? <a href="/signup" className="text-orange-500 hover:underline font-semibold">Sign up here</a></p>
      </div>
    </div>
  );
}
