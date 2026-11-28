import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  FolderLock, Search, ShieldCheck, Download, Trash2,
  RefreshCw, Hash, CheckCircle2, AlertTriangle,
  UploadCloud, Copy, Check, FileText, Eye, X,
  Image, Film, FileAudio, File, Loader2, ZoomIn, ZoomOut,
  Folder, FolderOpen, ChevronDown, ChevronRight, Tag
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { evidenceService } from '../services/api';

/* ─────────────────────────── type helpers ─────────────────────────── */
const isImage  = (t, n) => t?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i.test(n);
const isVideo  = (t, n) => t?.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(n);
const isAudio  = (t, n) => t?.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(n);
const isPdf    = (t, n) => t === 'application/pdf' || /\.pdf$/i.test(n);
const isCsv    = (t, n) => /\.csv$/i.test(n) || t === 'text/csv';
const isExcel  = (t, n) => /\.(xlsx?|xlsm|xlsb)$/i.test(n) || t?.includes('spreadsheet') || t?.includes('excel');
const isText   = (t, n) => (t?.startsWith('text/') || /\.(txt|log|json|xml|md)$/i.test(n)) && !isCsv(t, n);
const isZip    = (t, n) => t === 'application/zip' || /\.(zip|gz|tar|7z|rar)$/i.test(n);

const canPreview = (t, n) =>
  isImage(t, n) || isVideo(t, n) || isAudio(t, n) ||
  isPdf(t, n)   || isText(t, n)  || isCsv(t, n)   || isExcel(t, n);

function FileIcon({ type, name, className = 'w-5 h-5' }) {
  if (isImage(type, name))  return <Image     className={`${className} text-cyan-400`} />;
  if (isVideo(type, name))  return <Film      className={`${className} text-violet-400`} />;
  if (isAudio(type, name))  return <FileAudio className={`${className} text-pink-400`} />;
  if (isPdf(type, name))    return <FileText  className={`${className} text-orange-400`} />;
  if (isCsv(type, name))    return <FileText  className={`${className} text-emerald-400`} />;
  if (isExcel(type, name))  return <FileText  className={`${className} text-green-400`} />;
  if (isZip(type, name))    return <Folder    className={`${className} text-yellow-400`} />;
  return <File className={`${className} text-slate-400`} />;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* ─── Spreadsheet Table (CSV / XLSX) ─── */
function SpreadsheetPreview({ rows, filename }) {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil((rows.length - 1) / pageSize));
  const headers  = rows[0] || [];
  const dataRows = rows.slice(1 + page * pageSize, 1 + (page + 1) * pageSize);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="text-xs font-mono text-slate-400">
        {rows.length - 1} rows · {headers.length} columns · {filename}
      </div>
      <div className="flex-1 overflow-auto rounded-lg border border-slate-700">
        <table className="text-xs font-mono text-slate-300 w-full border-collapse">
          <thead>
            <tr className="bg-slate-800 sticky top-0">
              <th className="px-2 py-1.5 text-slate-500 border-r border-slate-700 text-right w-10">#</th>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-1.5 text-left text-cyan-400 border-r border-slate-700 whitespace-nowrap">{String(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-900/30'}>
                <td className="px-2 py-1 text-slate-600 border-r border-slate-800 text-right">{page * pageSize + ri + 1}</td>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-1 border-r border-slate-800 whitespace-nowrap max-w-xs truncate">
                    {String(row[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40">← Prev</button>
          <span>Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Preview Modal ─────────────────────────── */
function PreviewModal({ item, onClose }) {
  const [objectUrl, setObjectUrl]     = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [sheetRows, setSheetRows]     = useState(null);  // CSV / XLSX rows
  const [loadError, setLoadError]     = useState('');
  const [loading, setLoading]         = useState(true);
  const [zoom, setZoom]               = useState(1);

  const type = item.file_type;
  const name = item.original_filename;

  useEffect(() => {
    let url = null;
    (async () => {
      try {
        const res  = await evidenceService.download(item.id);
        const blob = new Blob([res.data], { type: type || 'application/octet-stream' });

        if (isCsv(type, name)) {
          /* ── CSV: parse text into rows ── */
          const text = await blob.text();
          const rows = text.trim().split('\n').map(r =>
            r.split(',').map(cell => cell.replace(/^"|"$/g, '').trim())
          );
          setSheetRows(rows);

        } else if (isExcel(type, name)) {
          /* ── XLSX: parse binary with SheetJS ── */
          const ab   = await blob.arrayBuffer();
          const wb   = XLSX.read(ab, { type: 'array' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          setSheetRows(rows);

        } else if (isText(type, name)) {
          const text = await blob.text();
          setTextContent(text);

        } else {
          url = URL.createObjectURL(blob);
          setObjectUrl(url);
        }
      } catch (err) {
        setLoadError(err.response?.data?.detail || 'Failed to decrypt file for preview.');
      } finally {
        setLoading(false);
      }
    })();

    return () => { if (url) URL.revokeObjectURL(url); };
  }, [item.id]);

  /* Close on Escape */
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const previewable = canPreview(type, name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[#0b101d] border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.2)] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileIcon type={type} name={name} className="w-5 h-5 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-100 truncate">{item.title}</p>
              <p className="text-[11px] font-mono text-slate-400 truncate">{name} · {formatBytes(item.file_size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isImage(type, name) && (
              <>
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-xs font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"><ZoomIn className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto flex items-center justify-center min-h-0 p-4 bg-[#070b14]">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-mono">Decrypting evidence with AES-256-GCM...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center gap-3 text-red-400 text-center">
              <AlertTriangle className="w-10 h-10" />
              <p className="text-sm">{loadError}</p>
            </div>
          )}

          {/* IMAGE */}
          {!loading && !loadError && objectUrl && isImage(type, name) && (
            <div className="overflow-auto flex items-center justify-center w-full h-full">
              <img
                src={objectUrl} alt={name}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
                className="max-w-none rounded-lg shadow-xl"
              />
            </div>
          )}

          {/* VIDEO */}
          {!loading && !loadError && objectUrl && isVideo(type, name) && (
            <video src={objectUrl} controls autoPlay className="max-w-full max-h-full rounded-lg" />
          )}

          {/* AUDIO */}
          {!loading && !loadError && objectUrl && isAudio(type, name) && (
            <div className="flex flex-col items-center gap-6 p-8">
              <FileAudio className="w-20 h-20 text-cyan-400" />
              <p className="text-sm font-mono text-slate-300">{name}</p>
              <audio src={objectUrl} controls className="w-full max-w-sm" />
            </div>
          )}

          {/* PDF */}
          {!loading && !loadError && objectUrl && isPdf(type, name) && (
            <iframe src={objectUrl} className="w-full h-full min-h-[70vh] rounded-lg border border-slate-700" title={name} />
          )}

          {/* TEXT */}
          {!loading && !loadError && textContent !== null && (
            <pre className="w-full max-h-[65vh] overflow-auto p-4 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
              {textContent}
            </pre>
          )}

          {/* CSV / XLSX spreadsheet */}
          {!loading && !loadError && sheetRows !== null && (
            <div className="w-full h-full flex flex-col min-h-[55vh]">
              <SpreadsheetPreview rows={sheetRows} filename={name} />
            </div>
          )}

          {/* Unsupported */}
          {!loading && !loadError && !previewable && (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <File className="w-16 h-16 text-slate-600" />
              <p className="text-sm font-mono text-center">
                Preview not available for <span className="text-cyan-400">{type || 'this file type'}</span>.<br />
                Use Decrypt &amp; Download to open it.
              </p>
            </div>
          )}

          {/* ZIP archive hint */}
          {!loading && !loadError && objectUrl && isZip(type, name) && (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <Folder className="w-16 h-16 text-yellow-400" />
              <p className="text-sm font-mono text-center">
                This is a <span className="text-yellow-400">ZIP archive</span> (likely a folder upload).<br />
                Use Decrypt &amp; Download to extract its contents.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Decrypted in-browser via AES-256-GCM · Preview is temporary and not saved</span>
          </div>
          <button onClick={onClose} className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Group Section ─────────────────────── */
function GroupSection({ groupName, items, onPreview, onVerify, onDownload, onDelete, onCopyHash, verifyingId, downloadingId, deletingId, integrityStatus, copiedId }) {
  const [collapsed, setCollapsed] = useState(false);
  const isUncategorized = groupName === '__uncategorized__';
  const displayName = isUncategorized ? 'Uncategorized' : groupName;

  return (
    <div className="rounded-2xl bg-[#0a0f1e] border border-slate-800 overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          {collapsed
            ? <FolderOpen className="w-4 h-4 text-cyan-400" />
            : <FolderOpen className="w-4 h-4 text-cyan-400" />
          }
          <span className="font-semibold text-sm text-slate-100">{displayName}</span>
          {!isUncategorized && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono">
              <Tag className="w-2.5 h-2.5" /> Case
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {collapsed
          ? <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          : <ChevronDown  className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        }
      </button>

      {/* Evidence cards inside group */}
      {!collapsed && (
        <div className="divide-y divide-slate-800/60 px-4 pb-4 pt-1 space-y-3">
          {items.map(item => (
            <EvidenceCard
              key={item.id}
              item={item}
              onPreview={onPreview}
              onVerify={onVerify}
              onDownload={onDownload}
              onDelete={onDelete}
              onCopyHash={onCopyHash}
              verifyingId={verifyingId}
              downloadingId={downloadingId}
              deletingId={deletingId}
              integrity={integrityStatus[item.id]}
              copied={copiedId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Evidence Card ─────────────────────── */
function EvidenceCard({ item, onPreview, onVerify, onDownload, onDelete, onCopyHash, verifyingId, downloadingId, deletingId, integrity, copied }) {
  const type = item.file_type;
  const name = item.original_filename;
  const previewable = canPreview(type, name);

  return (
    <div className="rounded-xl bg-[#0c1222] border border-slate-800 hover:border-cyan-500/30 p-5 transition-all shadow-md space-y-4 mt-3">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex gap-4 items-start">
          {/* Icon / preview trigger */}
          <div
            onClick={() => previewable && onPreview(item)}
            className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center border ${
              previewable
                ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 cursor-pointer hover:bg-cyan-900/40 hover:scale-105 transition-all'
                : 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-default'
            }`}
            title={previewable ? 'Click to preview' : 'Preview not available'}
          >
            {previewable ? <Eye className="w-6 h-6" /> : <FileIcon type={type} name={name} className="w-6 h-6" />}
          </div>

          <div className="space-y-1 overflow-hidden">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 shrink-0">
                #{item.id}
              </span>
              {item.group_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-900/30 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono">
                  <Tag className="w-2.5 h-2.5" />{item.group_name}
                </span>
              )}
            </div>
            {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono pt-1">
              <div className="flex items-center gap-1.5">
                <FileIcon type={type} name={name} className="w-3.5 h-3.5" />
                <span className="text-slate-300">{name}</span>
              </div>
              <span>•</span>
              <span>Size: <span className="text-slate-300">{formatBytes(item.file_size)}</span></span>
              <span>•</span>
              <span>Deposited: <span className="text-slate-300">{new Date(item.uploaded_at).toLocaleString()}</span></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {previewable && (
            <button
              onClick={() => onPreview(item)}
              className="px-3 py-1.5 rounded-lg bg-violet-950/40 border border-violet-500/40 text-violet-300 hover:bg-violet-900/40 text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /><span>Preview</span>
            </button>
          )}
          <button
            onClick={() => onVerify(item.id)}
            disabled={verifyingId === item.id}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/40 text-xs font-mono transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${verifyingId === item.id ? 'animate-spin' : ''}`} />
            <span>{verifyingId === item.id ? 'Verifying...' : 'Verify Integrity'}</span>
          </button>
          <button
            onClick={() => onDownload(item)}
            disabled={downloadingId === item.id}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40 text-xs font-mono transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadingId === item.id ? 'Decrypting...' : 'Decrypt & Download'}</span>
          </button>
          <button
            onClick={() => onDelete(item.id, item.title)}
            disabled={deletingId === item.id}
            className="p-1.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 text-xs transition-colors"
            title="Purge Evidence"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cryptographic Metadata */}
      <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-[11px] font-mono space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 shrink-0">SHA-256 HASH:</span>
            <span className="text-cyan-300 truncate select-all">{item.file_hash}</span>
          </div>
          <button
            onClick={() => onCopyHash(item.file_hash, item.id)}
            className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-cyan-400 shrink-0"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
          <div><span>AES Nonce (IV): </span><span className="text-slate-300">{item.nonce}</span></div>
          <div><span>GCM Auth Tag: </span><span className="text-slate-300">{item.tag}</span></div>
        </div>
      </div>

      {/* Integrity Result */}
      {integrity && (
        <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
          integrity.is_valid
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/40 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {integrity.is_valid
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            }
            <span>{integrity.message}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40">
            {integrity.status}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Main Component ─────────────────────────── */
const EvidenceVault = () => {
  const [evidences, setEvidences]           = useState([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [loading, setLoading]               = useState(true);
  const [verifyingId, setVerifyingId]       = useState(null);
  const [downloadingId, setDownloadingId]   = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState({});
  const [copiedId, setCopiedId]             = useState(null);
  const [previewItem, setPreviewItem]       = useState(null);

  useEffect(() => { fetchEvidences(); }, []);

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
      setIntegrityStatus(prev => ({ ...prev, [id]: res.data }));
    } catch {
      setIntegrityStatus(prev => ({ ...prev, [id]: { is_valid: false, message: 'Cryptographic verification check failed', status: 'TAMPERED' } }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDownload = async (item) => {
    setDownloadingId(item.id);
    try {
      const res  = await evidenceService.download(item.id);
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', item.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to decrypt and download: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}" from the vault? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await evidenceService.delete(id);
      setEvidences(prev => prev.filter(e => e.id !== id));
    } catch {
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

  /* ── Filter by search ── */
  const filtered = evidences.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.file_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.group_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Group by group_name ── */
  const groups = {};
  filtered.forEach(item => {
    const key = item.group_name?.trim() || '__uncategorized__';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  // Named groups alphabetically, Uncategorized last
  const namedKeys = Object.keys(groups).filter(k => k !== '__uncategorized__').sort();
  const orderedKeys = [...namedKeys, ...(groups['__uncategorized__'] ? ['__uncategorized__'] : [])];

  const totalCount = filtered.length;

  const sharedCardProps = {
    onPreview:    setPreviewItem,
    onVerify:     handleVerify,
    onDownload:   handleDownload,
    onDelete:     handleDelete,
    onCopyHash:   copyHash,
    verifyingId,
    downloadingId,
    deletingId,
    integrityStatus,
    copiedId,
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <Navbar />

      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-2">
              <FolderLock className="w-3.5 h-3.5" />
              AUTHENTICATED EVIDENCE VAULT
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Forensic Repository &amp; Integrity Ledger
            </h1>
            {!loading && (
              <p className="text-xs font-mono text-slate-500 mt-1">
                {totalCount} evidence item{totalCount !== 1 ? 's' : ''} · {orderedKeys.filter(k => k !== '__uncategorized__').length} case group{orderedKeys.filter(k => k !== '__uncategorized__').length !== 1 ? 's' : ''}
              </p>
            )}
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
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, filename, SHA-256 hash, or case group..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0c1222] border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 font-mono text-sm">
            Accessing encrypted Supabase vault...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-[#0c1222] border border-slate-800/80 p-12 text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">
              {searchQuery ? 'No evidence items match your query' : 'Your vault is empty'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Upload forensic files to encrypt them with AES-256-GCM and store their integrity hashes.'}
            </p>
            {!searchQuery && (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-xs font-mono hover:from-cyan-400 hover:to-teal-400 transition-all"
              >
                <UploadCloud className="w-4 h-4" /> Deposit First Evidence
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {orderedKeys.map(key => (
              <GroupSection
                key={key}
                groupName={key}
                items={groups[key]}
                {...sharedCardProps}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EvidenceVault;
