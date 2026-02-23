import { useState } from 'react';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showPasswordGif = passwordFocused && password.length > 0;

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

              <div
                className={`mt-4 h-[110px] overflow-hidden rounded-xl transition-colors duration-200 ${
                  showPasswordGif ? 'border border-white/10 bg-white/5' : 'border border-transparent bg-transparent'
                }`}
              >
                <img
                  src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHI3aWt1OHpkaW03NzZvOTR1c2VreHZkNjBlYWNkeTYzc2pwcjM3biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WRuBiZKB6xgsS9DrFA/giphy.gif"
                  alt="See no evil monkey"
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    showPasswordGif ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
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
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
