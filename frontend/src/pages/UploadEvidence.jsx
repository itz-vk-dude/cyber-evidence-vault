import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileUp, Lock, CheckCircle2, AlertCircle,
  Hash, ShieldCheck, Loader2, ArrowLeft, ArrowRight, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { evidenceService } from '../services/api';

const UploadEvidence = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an evidence file to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const res = await evidenceService.upload(formData);
      setUploadResult(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Upload or encryption failed. Please verify the file and backend status.'
      );
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/vault')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Evidence Vault</span>
          </button>
        </div>

        {/* Upload Success Modal / Panel */}
        {uploadResult ? (
          <div className="rounded-2xl bg-[#0c1222] border border-emerald-500/30 p-8 shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Evidence Encrypted & Deposited Successfully
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Record ID: #{uploadResult.id} • Stored securely with AES-256-GCM
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">EVIDENCE TITLE:</span>
                <span className="text-slate-200 font-semibold">{uploadResult.title}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] mb-1">ORIGINAL FILENAME:</span>
                <span className="text-slate-300">{uploadResult.original_filename} ({formatBytes(uploadResult.file_size)})</span>
              </div>

              <div>
                <span className="text-cyan-400 block text-[11px] mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  SHA-256 INTEGRITY DIGEST:
                </span>
                <div className="p-2.5 rounded bg-black/60 border border-cyan-500/30 text-cyan-300 break-all select-all">
                  {uploadResult.file_hash}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">AES-GCM NONCE (IV):</span>
                  <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300 truncate">
                    {uploadResult.nonce}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">AES-GCM AUTH TAG:</span>
                  <div className="p-2 rounded bg-black/40 border border-slate-800 text-slate-300 truncate">
                    {uploadResult.tag}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUploadResult(null);
                  setFile(null);
                  setTitle('');
                  setDescription('');
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Upload Another File
              </button>

              <button
                type="button"
                onClick={() => navigate('/vault')}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-xs font-mono hover:from-cyan-400 hover:to-teal-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2"
              >
                <span>View in Vault</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <div className="rounded-2xl bg-[#0c1222] border border-cyan-500/20 p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
                <Lock className="w-3 h-3" />
                AES-256-GCM HARDENED UPLOAD
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Deposit Forensic Evidence
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Files are cryptographically hashed with SHA-256 for tampering detection and encrypted in-memory before saving to storage.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dropzone */}
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Evidence File
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : file
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <div className="text-sm font-semibold text-slate-200 mt-1">{file.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {formatBytes(file.size)} • {file.type || 'binary data'}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 font-mono inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <div className="text-sm font-medium text-slate-300 mt-1">
                        Drag and drop your evidence file here, or <span className="text-cyan-400 underline">browse</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Supports logs, disk dumps, pcaps, documents, images, and archives
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Evidence Label / Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans transition-all"
                  placeholder="e.g., Honeypot Breach Incident Log - Server Alpha"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
                  Forensic Notes / Case Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans transition-all"
                  placeholder="Provide incident ID, chain of custody observations, or server timestamps..."
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Encrypting with AES-256-GCM & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Lock & Encrypt into Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default UploadEvidence;
