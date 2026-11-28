import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, RefreshCw, AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/api';

const OTPVerification = () => {
  const navigate = useNavigate();
  const [tempToken, setTempToken] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('temp_token');
    const masked = sessionStorage.getItem('email_masked');

    if (!token) {
      navigate('/login');
      return;
    }

    setTempToken(token);
    if (masked) {
      setEmailMasked(masked);
    }
  }, [navigate]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await authService.verifyOTP(tempToken, otpCode);
      const { access_token, user } = res.data;

      localStorage.setItem('vault_token', access_token);
      localStorage.setItem('vault_user', JSON.stringify(user));

      // Clean up session tokens
      sessionStorage.removeItem('temp_token');
      sessionStorage.removeItem('is_totp_setup');
      sessionStorage.removeItem('email_masked');

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Invalid 6-digit code. Please check your email or request a new code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setError('');
    setSuccessMsg('');
    setResending(true);

    try {
      const res = await authService.resendOTP(tempToken);
      setSuccessMsg(res.data?.message || 'New verification code dispatched to your email.');
      setResendCooldown(30);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code. Please try logging in again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg">
        <div className="bg-gradient-to-b from-cyan-500/20 via-slate-800/40 to-slate-900/80 p-0.5 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
          <div className="bg-[#0b101d] rounded-2xl p-8 border border-cyan-500/20">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-wider text-slate-100 uppercase">
                Two-Factor Authentication
              </h1>
              <p className="text-xs text-cyan-400/80 mt-1 font-mono tracking-widest uppercase">
                Email Security Verification
              </p>
            </div>

            {/* Recipient Email Banner */}
            <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 mb-1">
                <Mail className="w-4 h-4" />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-sm font-mono text-slate-200 mt-1">
                {emailMasked ? (
                  <span>Dispatched to <strong className="text-cyan-300">{emailMasked}</strong></span>
                ) : (
                  <span>Dispatched to your registered email address</span>
                )}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                Code expires in 10 minutes. Delivered via Brevo Email API.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-6 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Verification Form */}
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Email Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 bg-slate-900/90 border border-slate-700 rounded-lg text-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-600"
                  placeholder="000000"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Security Code...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Unlock Evidence Vault</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resend Code Button */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono disabled:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resending
                      ? 'Sending new code...'
                      : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Didn't receive email? Resend code"}
                  </span>
                </button>
              </div>

              {/* Back to Login */}
              <div className="pt-2 text-center border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Password Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
