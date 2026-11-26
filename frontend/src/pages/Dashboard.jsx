import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, Database, FileText, CheckCircle2,
  AlertTriangle, UploadCloud, FolderLock, RefreshCw,
  ExternalLink, Hash, ArrowUpRight
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { evidenceService } from '../services/api';

const Dashboard = () => {
  const [evidences, setEvidences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [integrityResults, setIntegrityResults] = useState({});

  const user = JSON.parse(localStorage.getItem('vault_user') || '{"username": "admin"}');

  useEffect(() => {
    fetchEvidences();
  }, []);

  const fetchEvidences = async () => {
    setLoading(true);
    try {
      const res = await evidenceService.list();
      setEvidences(res.data);
    } catch (err) {
      console.error('Failed to load evidence records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      const res = await evidenceService.verifyIntegrity(id);
      setIntegrityResults((prev) => ({ ...prev, [id]: res.data }));
    } catch (err) {
      setIntegrityResults((prev) => ({
        ...prev,
        [id]: { is_valid: false, message: 'Verification call failed' },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const totalBytes = evidences.reduce((sum, item) => sum + (item.file_size || 0), 0);
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-emerald-950/40 border border-cyan-500/20 p-6 sm:p-8 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                VAULT OPERATIONAL & SECURE
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">{user.username}</span>
              </h1>
              <p className="mt-1 text-sm text-slate-400 max-w-2xl">
                Cyber Evidence Vault protects digital forensic items with authenticated AES-256-GCM encryption and SHA-256 integrity verification stored across Supabase PostgreSQL.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Evidence</span>
              </Link>
              <Link
                to="/vault"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-medium transition-all"
              >
                <FolderLock className="w-4 h-4 text-cyan-400" />
                <span>Open Vault</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Vault Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#0c1222] border border-cyan-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Vault Files</span>
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">{evidences.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">Encrypted forensic records</div>
          </div>

          <div className="p-5 rounded-xl bg-[#0c1222] border border-emerald-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Storage Size</span>
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{formatBytes(totalBytes)}</div>
            <div className="text-[11px] text-slate-500 mt-1">Encrypted on-disk payload</div>
          </div>

          <div className="p-5 rounded-xl bg-[#0c1222] border border-purple-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Cryptographic Cipher</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold font-mono text-purple-300">AES-256-GCM</div>
            <div className="text-[11px] text-slate-500 mt-1">Authenticated 96-bit Nonce + Tag</div>
          </div>

          <div className="p-5 rounded-xl bg-[#0c1222] border border-blue-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider">Database Cloud</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold font-mono text-blue-300">Supabase PostgreSQL</div>
            <div className="text-[11px] text-slate-500 mt-1">Connected with SSL session pooler</div>
          </div>
        </div>

        {/* Recent Evidence Table */}
        <div className="bg-[#0c1222] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderLock className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-base text-slate-200">Recent Vault Deposits</h2>
            </div>
            <button
              onClick={fetchEvidences}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-all text-xs flex items-center gap-1 font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm font-mono">
              Decrypting and querying evidence records...
            </div>
          ) : evidences.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm text-slate-400">No evidence items uploaded yet.</div>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-mono hover:bg-cyan-500/20 transition-all"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload First Evidence
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Title / Filename</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">SHA-256 Hash</th>
                    <th className="py-3 px-4">Integrity Check</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {evidences.slice(0, 5).map((item) => {
                    const integrity = integrityResults[item.id];
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-medium text-slate-200">{item.title}</div>
                          <div className="text-xs text-slate-500 font-mono truncate max-w-xs">
                            {item.original_filename}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{formatBytes(item.file_size)}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 truncate max-w-[180px]">
                            <Hash className="w-3 h-3 text-cyan-400 shrink-0" />
                            {item.file_hash.substring(0, 16)}...
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {integrity ? (
                            integrity.is_valid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" />
                                VALID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-red-400 bg-red-950/40 border border-red-500/40 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                TAMPERED
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleVerify(item.id)}
                              disabled={verifyingId === item.id}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
                            >
                              {verifyingId === item.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Checking...</span>
                                </>
                              ) : (
                                <span>Verify Hash</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to="/vault"
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-[11px]"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
