import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, KeyRound, User, Lock, AlertCircle, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { authService } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(username, password);
      const data = response.data;

      // Save 2FA session details
      sessionStorage.setItem('temp_token', data.temp_token);
      sessionStorage.setItem('is_totp_setup', data.is_totp_setup ? 'true' : 'false');
      sessionStorage.setItem('email_masked', data.email_masked || '');
      sessionStorage.setItem('auth_username', username);

      // Route to Step 2: 2FA Verification
      navigate('/verify-otp');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Cyber Grid / Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Glow Frame */}
        <div className="bg-gradient-to-b from-cyan-500/20 via-slate-800/40 to-slate-900/80 p-0.5 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
          <div className="bg-[#0b101d] rounded-2xl p-8 border border-cyan-500/20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-wider text-slate-100 uppercase">
                Cyber Evidence Vault
              </h1>
              <p className="text-xs text-cyan-400/80 mt-1 font-mono tracking-widest uppercase">
                Step 1: Authorized Access Portal
              </p>
              <div className="mt-3 inline-block px-3 py-1 bg-slate-900 border border-slate-700/60 rounded-full text-[11px] text-slate-400 font-mono">
                Secure Vault Authentication
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Vault Username or Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
                    placeholder="Username or email address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Master Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to 2FA Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Register Link for New Users */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400 font-mono">
                New user?{' '}
                <Link
                  to="/register"
                  className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
                >
                  Register for Vault Access
                </Link>
              </p>
            </div>

            {/* Bottom Security Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-mono">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Protected by Argon2id, AES-256-GCM & Brevo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
