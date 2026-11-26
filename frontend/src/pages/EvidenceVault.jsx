import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderLock, Search, ShieldCheck, Download, Trash2,
  RefreshCw, Hash, Lock, CheckCircle2, AlertTriangle,
  UploadCloud, Copy, Check, FileText
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { evidenceService } from '../services/api';

const EvidenceVault = () => {
  const [evidences, setEvidences] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchEvidences();
  }, []);

  const fetchEvidences = async () => {
    setLoading(true);
    try {
      const res = await evidenceService.list();
      setEvidences(res.data);
    } catch (err) {
      console.error('Failed to load vault items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      const res = await evidenceService.verifyIntegrity(id);
      setIntegrityStatus((prev) => ({ ...prev, [id]: res.data }));
    } catch (err) {
      setIntegrityStatus((prev) => ({
        ...prev,
        [id]: { is_valid: false, message: 'Cryptographic verification check failed' },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDownload = async (item) => {
    setDownloadingId(item.id);
    try {
      const res = await evidenceService.download(item.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', item.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to decrypt and download evidence: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete evidence "${title}" from the vault? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await evidenceService.delete(id);
      setEvidences((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert('Failed to delete evidence item.');
    } finally {
      setDeletingId(null);
    }
  };

  const copyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filtered = evidences.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.file_hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
              <FolderLock className="w-3.5 h-3.5" />
              AUTHENTICATED EVIDENCE VAULT
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Forensic Repository & Integrity Ledger
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-xs font-mono hover:from-cyan-400 hover:to-teal-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Deposit Evidence</span>
            </Link>

            <button
              onClick={fetchEvidences}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Refresh Vault Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by evidence title, filename, or SHA-256 integrity hash..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0c1222] border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Vault Items List */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-mono text-sm">
            Accessing encrypted Supabase vault...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-[#0c1222] border border-slate-800/80 p-12 text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">No evidence items match your query</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery ? 'Try adjusting your search terms.' : 'Upload forensic files to encrypt them with AES-256-GCM and store their integrity hashes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const integrity = integrityStatus[item.id];
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#0c1222] border border-slate-800 hover:border-cyan-500/30 p-5 transition-all shadow-md space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          #{item.id}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400">{item.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono pt-1">
                        <span>Original: <span className="text-slate-300">{item.original_filename}</span></span>
                        <span>•</span>
                        <span>Size: <span className="text-slate-300">{formatBytes(item.file_size)}</span></span>
                        <span>•</span>
                        <span>Deposited: <span className="text-slate-300">{new Date(item.uploaded_at).toLocaleString()}</span></span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleVerify(item.id)}
                        disabled={verifyingId === item.id}
                        className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/40 text-xs font-mono transition-all flex items-center gap-1.5"
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${verifyingId === item.id ? 'animate-spin' : ''}`} />
                        <span>{verifyingId === item.id ? 'Verifying...' : 'Verify Integrity'}</span>
                      </button>

                      <button
                        onClick={() => handleDownload(item)}
                        disabled={downloadingId === item.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40 text-xs font-mono transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === item.id ? 'Decrypting...' : 'Decrypt & Download'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 text-xs transition-colors"
                        title="Purge Evidence"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Cryptographic Metadata Banner */}
                  <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-400 shrink-0">SHA-256 HASH:</span>
                        <span className="text-cyan-300 truncate select-all">{item.file_hash}</span>
                      </div>
                      <button
                        onClick={() => copyHash(item.file_hash, item.id)}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 shrink-0"
                      >
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <div>
                        <span>AES Nonce (IV): </span>
                        <span className="text-slate-300">{item.nonce}</span>
                      </div>
                      <div>
                        <span>GCM Auth Tag: </span>
                        <span className="text-slate-300">{item.tag}</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Outcome Toast */}
                  {integrity && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
                        integrity.is_valid
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {integrity.is_valid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{integrity.message}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40">
                        {integrity.status}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default EvidenceVault;
