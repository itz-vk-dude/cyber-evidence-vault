import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldCheck, Database, Lock, LogOut, UploadCloud, FolderLock, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('vault_user') || '{"username": "admin"}');

  const handleLogout = () => {
    localStorage.removeItem('vault_token');
    localStorage.removeItem('vault_user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Evidence Vault', path: '/vault', icon: FolderLock },
    { name: 'Upload Evidence', path: '/upload', icon: UploadCloud },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0c1222]/90 backdrop-blur-md border-b border-cyan-500/20 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-lg bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                CYBER EVIDENCE VAULT
              </span>
              <div className="text-[10px] text-cyan-500/80 tracking-widest uppercase font-mono">
                SECURE DIGITAL FORENSICS
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Status Badges & User */}
          <div className="flex items-center gap-3">
            {/* Security Pills */}
            <div className="hidden lg:flex items-center gap-2 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
                <Lock className="w-3 h-3 text-cyan-400" />
                AES-256-GCM
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                <Database className="w-3 h-3 text-emerald-400" />
                Supabase
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-400">
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                TOTP 2FA
              </span>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700/60">
              <span className="text-xs text-slate-300 font-mono hidden sm:inline-block">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                title="Lock Vault & Sign Out"
                className="p-1.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-red-300 hover:border-red-400 transition-all flex items-center gap-1 text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Lock Vault</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
