import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import {
  UploadCloud, FileUp, Lock, CheckCircle2, AlertCircle,
  ShieldCheck, Loader2, ArrowLeft, ArrowRight, X,
  FolderOpen, Files, Image, Film, FileAudio, File,
  Plus, Trash2, Tag
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { evidenceService } from '../services/api';

/* ─── helpers ─── */
const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const fileIcon = (file) => {
  const t = file.type || '';
  const n = (file.name || '').toLowerCase();
  if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return <Image className="w-4 h-4 text-cyan-400" />;
  if (t.startsWith('video/') || /\.(mp4|webm|mov|avi)$/.test(n))            return <Film className="w-4 h-4 text-violet-400" />;
  if (t.startsWith('audio/') || /\.(mp3|wav|ogg|flac)$/.test(n))            return <FileAudio className="w-4 h-4 text-pink-400" />;
  if (/\.(xlsx?|csv)$/.test(n))                                               return <File className="w-4 h-4 text-emerald-400" />;
  if (/\.pdf$/.test(n))                                                       return <File className="w-4 h-4 text-orange-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
};

const MODES = { SINGLE: 'single', MULTI: 'multi', FOLDER: 'folder' };

const makeItem = (file, overrideTitle = '') => ({
  id: Math.random().toString(36).slice(2),
  file,
  title: overrideTitle || file.name.replace(/\.[^/.]+$/, ''),
  description: '',
  status: 'pending',
  result: null,
  error: '',
  progress: 0,
});

const UploadEvidence = () => {
  const navigate = useNavigate();

  /* Refs for file inputs */
  const fileInputRef   = useRef(null);
  const multiInputRef  = useRef(null);

  /* Folder input uses a callback ref to set webkitdirectory on the DOM node */
  const folderInputNode = useRef(null);
  const folderRefCallback = useCallback((node) => {
    if (node) {
      node.setAttribute('webkitdirectory', '');
      node.setAttribute('directory', '');
      folderInputNode.current = node;
    }
  }, []);

  const [mode, setMode] = useState(MODES.SINGLE);
  const [items, setItems] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [globalError, setGlobalError] = useState('');

  /* drag/drop */
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const files = [...(e.dataTransfer.files || [])];
    if (!files.length) return;
    if (files.length === 1 && mode === MODES.SINGLE) {
      setItems([makeItem(files[0])]);
    } else {
      setMode(MODES.MULTI);
      setItems(prev => [...prev, ...files.map(f => makeItem(f))]);
    }
  };

  /* file pickers */
  const pickSingle = (e) => {
    const f = e.target.files?.[0];
    if (f) setItems([makeItem(f)]);
    e.target.value = '';
  };

  const pickMulti = (e) => {
    const files = [...(e.target.files || [])];
    setItems(prev => [...prev, ...files.map(f => makeItem(f))]);
    e.target.value = '';
  };

  /* Folder picker — zip all files client-side */
  const pickFolder = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    e.target.value = '';

    const folderName = files[0].webkitRelativePath?.split('/')[0] || 'folder';
    const zip = new JSZip();
    files.forEach(f => zip.file(f.webkitRelativePath || f.name, f));

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const zipFile = new File([zipBlob], `${folderName}.zip`, { type: 'application/zip' });

    // Auto-set group name from folder name if empty
    if (!groupName) setGroupName(folderName);
    setItems(prev => [...prev, makeItem(zipFile, folderName)]);
  };

  /* item helpers */
  const updateItem = (id, patch) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  const removeItem = (id) =>
    setItems(prev => prev.filter(it => it.id !== id));

  /* upload */
  const uploadOne = async (item) => {
    updateItem(item.id, { status: 'uploading', progress: 0 });
    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('title', item.title || item.file.name);
    formData.append('description', item.description || '');
    if (groupName.trim()) formData.append('group_name', groupName.trim());

    try {
      const res = await evidenceService.upload(formData, (evt) => {
        if (evt.total) updateItem(item.id, { progress: Math.round((evt.loaded / evt.total) * 100) });
      });
      updateItem(item.id, { status: 'done', result: res.data, progress: 100 });
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err.response?.data?.detail || err.message || 'Upload failed' });
    }
  };

  const handleUploadAll = async (e) => {
    e.preventDefault();
    const pending = items.filter(it => it.status === 'pending');
    if (!pending.length) { setGlobalError('Please add at least one file or folder.'); return; }
    setUploading(true); setGlobalError(''); setBatchDone(false);
    for (const item of pending) await uploadOne(item);
    setUploading(false); setBatchDone(true);
  };

  const resetAll = () => { setItems([]); setBatchDone(false); setGlobalError(''); setGroupName(''); setMode(MODES.SINGLE); };

  const doneCount  = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  /* ─────────────── render ─────────────── */
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <button onClick={() => navigate('/vault')} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Evidence Vault</span>
        </button>

        <div className="rounded-2xl bg-[#0c1222] border border-cyan-500/20 p-6 sm:p-8 shadow-xl space-y-6">

          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
              <Lock className="w-3 h-3" />AES-256-GCM HARDENED UPLOAD
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Deposit Forensic Evidence</h1>
            <p className="text-xs text-slate-400 mt-1">
              All files are SHA-256 hashed and AES-256-GCM encrypted. Folders are automatically zipped before encryption.
              Supports all file types — images, videos, PDFs, CSV, XLSX, logs, databases, binaries.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800 w-fit">
            {[
              { key: MODES.SINGLE, icon: <FileUp className="w-3.5 h-3.5" />,   label: 'Single File' },
              { key: MODES.MULTI,  icon: <Files className="w-3.5 h-3.5" />,    label: 'Multiple Files' },
              { key: MODES.FOLDER, icon: <FolderOpen className="w-3.5 h-3.5" />, label: 'Folder (auto-zip)' },
            ].map(tab => (
              <button key={tab.key} type="button"
                onClick={() => { setMode(tab.key); setItems([]); setBatchDone(false); setGlobalError(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  mode === tab.key ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-400 hover:text-cyan-300'
                }`}
              >{tab.icon}{tab.label}</button>
            ))}
          </div>

          {/* Case / Group Name */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />Case / Group Name <span className="text-slate-600 normal-case">(optional — groups evidence in vault)</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. Operation Nightfall, Case #2024-087, Phishing Investigation..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition-all"
            />
          </div>

          {/* Error */}
          {globalError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /><span>{globalError}</span>
            </div>
          )}

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-2">
              {mode === MODES.FOLDER ? 'Select Folder to Zip & Encrypt'
               : mode === MODES.MULTI ? 'Select Files (any type, any format)'
               : 'Evidence File (any type)'}
            </label>
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => {
                if (mode === MODES.FOLDER) folderInputNode.current?.click();
                else if (mode === MODES.MULTI) multiInputRef.current?.click();
                else fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : items.length
                  ? 'border-emerald-500/30 bg-emerald-950/5 hover:border-emerald-400/50'
                  : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/60'
              }`}
            >
              {/* Hidden inputs */}
              <input ref={fileInputRef}  type="file" accept="*/*" onChange={pickSingle} className="hidden" />
              <input ref={multiInputRef} type="file" accept="*/*" multiple onChange={pickMulti} className="hidden" />
              {/* Folder input — DOM attribute set via callback ref */}
              <input ref={folderRefCallback} type="file" multiple onChange={pickFolder} className="hidden" />

              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <div className={`p-3 rounded-xl border ${items.length ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400'}`}>
                  {mode === MODES.FOLDER ? <FolderOpen className="w-8 h-8" />
                   : mode === MODES.MULTI ? <Files className="w-8 h-8" />
                   : <UploadCloud className="w-8 h-8" />}
                </div>
                <div className="text-sm font-medium text-slate-300 mt-1">
                  {mode === MODES.FOLDER
                    ? <>Click to <span className="text-cyan-400 underline">pick a folder</span> — it will be auto-zipped &amp; encrypted</>
                    : mode === MODES.MULTI
                    ? <>Drag files here or <span className="text-cyan-400 underline">browse</span> to select multiple files</>
                    : <>Drag &amp; drop any file or <span className="text-cyan-400 underline">browse</span></>}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Images · Videos · PDFs · CSV · XLSX · Logs · PCAP · Disk Dumps · Archives · Any binary
                </div>
                {items.length > 0 && (
                  <div className="mt-1 text-xs font-mono text-cyan-300">{items.length} item(s) queued — click to add more</div>
                )}
              </div>
            </div>
          </div>

          {/* File Queue */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Upload Queue ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
                {!uploading && !batchDone && (
                  <button type="button" onClick={() => setItems([])}
                    className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />Clear all
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className={`rounded-lg border p-3 flex flex-col gap-2 transition-all ${
                    item.status === 'done'      ? 'border-emerald-500/30 bg-emerald-950/10'
                    : item.status === 'error'  ? 'border-red-500/30 bg-red-950/10'
                    : item.status === 'uploading' ? 'border-cyan-500/40 bg-cyan-950/10'
                    : 'border-slate-700/60 bg-slate-900/50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5 shrink-0">{fileIcon(item.file)}</div>
                      <div className="flex-1 min-w-0 space-y-1">
                        {item.status === 'pending' ? (
                          <input type="text" value={item.title}
                            onChange={e => updateItem(item.id, { title: e.target.value })}
                            placeholder="Evidence title..."
                            className="w-full bg-transparent text-sm font-semibold text-slate-100 border-b border-slate-700 focus:border-cyan-400 focus:outline-none pb-0.5 font-mono"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-slate-100 font-mono truncate">{item.title}</p>
                        )}
                        <p className="text-[11px] text-slate-400 font-mono">{item.file.name} · {formatBytes(item.file.size)}</p>
                        {item.status === 'pending' && (
                          <input type="text" value={item.description}
                            onChange={e => updateItem(item.id, { description: e.target.value })}
                            placeholder="Forensic notes (optional)..."
                            className="w-full bg-transparent text-xs text-slate-400 border-b border-slate-800 focus:border-cyan-500 focus:outline-none pb-0.5 font-mono"
                          />
                        )}
                        {item.status === 'uploading' && (
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                            <div className="bg-cyan-400 h-1.5 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                          </div>
                        )}
                        {item.status === 'done' && item.result && (
                          <p className="text-[11px] font-mono text-cyan-300 truncate">SHA-256: {item.result.file_hash?.slice(0, 24)}…</p>
                        )}
                        {item.status === 'error' && (
                          <p className="text-[11px] font-mono text-red-300">{item.error}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === 'pending'   && <span className="text-[10px] font-mono text-slate-500 uppercase">Queued</span>}
                        {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                        {item.status === 'done'      && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {item.status === 'error'     && <AlertCircle className="w-4 h-4 text-red-400" />}
                        {item.status === 'pending' && !uploading && (
                          <button type="button" onClick={() => removeItem(item.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batch result */}
          {batchDone && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              errorCount === 0 ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-amber-950/30 border-amber-500/40'
            }`}>
              {errorCount === 0
                ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                : <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />}
              <div>
                <p className="text-sm font-semibold">
                  {doneCount} of {items.length} item{items.length !== 1 ? 's' : ''} encrypted &amp; deposited
                  {errorCount > 0 ? ` · ${errorCount} failed` : ' successfully'}
                  {groupName.trim() ? ` → Group: "${groupName.trim()}"` : ''}
                </p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">AES-256-GCM encrypted · SHA-256 integrity hashes recorded</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!batchDone ? (
              <>
                {(mode === MODES.MULTI || mode === MODES.FOLDER) && items.length > 0 && !uploading && (
                  <button type="button"
                    onClick={() => mode === MODES.FOLDER ? folderInputNode.current?.click() : multiInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors border border-slate-700">
                    <Plus className="w-3.5 h-3.5" />Add More
                  </button>
                )}
                <button type="button" onClick={handleUploadAll}
                  disabled={uploading || !items.length || items.every(i => i.status !== 'pending')}
                  className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Encrypting &amp; Uploading...</span></>
                    : <><ShieldCheck className="w-4 h-4" />
                       <span>{items.length <= 1 ? 'Lock & Encrypt into Vault' : `Encrypt & Upload All (${items.filter(i => i.status === 'pending').length})`}</span></>}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={resetAll}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors">
                  Upload More
                </button>
                <button type="button" onClick={() => navigate('/vault')}
                  className="flex-1 py-2.5 px-5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-xs font-mono hover:from-cyan-400 hover:to-teal-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2">
                  <span>View in Vault</span><ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UploadEvidence;
