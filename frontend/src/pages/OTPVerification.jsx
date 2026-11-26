import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, QrCode, Key, AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/api';

const OTPVerification = () => {
  const navigate = useNavigate();
  const [tempToken, setTempToken] = useState('');
  const [isSetup, setIsSetup] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('temp_token');
    const isTotpSetup = sessionStorage.getItem('is_totp_setup') === 'true';

    if (!token) {
      navigate('/login');
      return;
    }

    setTempToken(token);
    setIsSetup(isTotpSetup);

    if (!isTotpSetup) {
      // Need initial Google Authenticator setup: fetch QR code
      fetchQR(token);
    }
  }, [navigate]);

  const fetchQR = async (token) => {
    setSetupLoading(true);
    try {
      const res = await authService.setupOTP(token);
      setQrData(res.data);
    } catch (err) {
      setError('Failed to generate authenticator QR code. Please try logging in again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (!isSetup) {
        // Initial setup confirmation
        res = await authService.enableOTP(tempToken, qrData.secret, otpCode);
      } else {
        // Normal 2FA login verification
        res = await authService.verifyOTP(tempToken, otpCode);
      }

      const { access_token, user } = res.data;
      localStorage.setItem('vault_token', access_token);
      localStorage.setItem('vault_user', JSON.stringify(user));

      // Clean up session token
      sessionStorage.removeItem('temp_token');
      sessionStorage.removeItem('is_totp_setup');

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Invalid 6-digit authenticator code. Check your clock or try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (qrData?.secret) {
      navigator.clipboard.writeText(qrData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

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
                {isSetup ? 'Google Authenticator Verification' : 'Initialize Authenticator 2FA'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* If initial setup: show QR code */}
            {!isSetup && (
              <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 mb-3 uppercase tracking-wider">
                  <QrCode className="w-4 h-4" />
                  <span>Scan with Google Authenticator</span>
                </div>

                {setupLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span>Generating Authenticator QR code...</span>
                  </div>
                ) : qrData ? (
                  <div>
                    <div className="inline-block p-2 rounded-xl bg-[#0b0f19] border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <img
                        src={qrData.qr_code_url}
                        alt="TOTP QR Code"
                        className="w-44 h-44 mx-auto rounded-lg"
                      />
                    </div>
                    <div className="mt-3">
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Or enter this manual secret in your app:
                      </span>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-xs hover:border-cyan-400 transition-all"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{qrData.secret}</span>
                        {copied && <span className="text-emerald-400 text-[10px] ml-1">(Copied!)</span>}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Authenticator Code
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
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Security Code...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSetup ? 'Unlock Evidence Vault' : 'Activate 2FA & Enter Vault'}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors"
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
