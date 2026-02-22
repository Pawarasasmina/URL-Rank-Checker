import { useState } from 'react';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin({ email, password });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#e0e7ff_0%,transparent_40%),radial-gradient(circle_at_bottom_right,#dbeafe_0%,transparent_45%)]" />

      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="hidden bg-slate-900 p-8 text-white md:flex md:flex-col md:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-slate-200">
                URL Rank Checker
              </p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight">Monitor brand rank performance with clarity.</h2>
              <p className="mt-3 max-w-sm text-sm text-slate-300">
                Sign in to run checks, track analytics, and manage automation in one place.
              </p>
            </div>
            <p className="text-xs text-slate-400">Secure access for Admin, Manager, and User roles.</p>
          </div>

          <form onSubmit={submit} className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">Use your account credentials to continue.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
