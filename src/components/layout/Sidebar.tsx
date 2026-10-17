'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  TestTubes,
  CheckCircle2,
  FileText,
  History,
  Settings,
  LogOut,
  Database,
  Check,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Import Excel', href: '/import', icon: FileSpreadsheet },
    { label: 'All Samples', href: '/samples', icon: TestTubes },
    { label: 'Positive Samples', href: '/positive-samples', icon: CheckCircle2, badge: 'Positives' },
    { label: 'Reports', href: '/reports', icon: FileText },
    { label: 'Import History', href: '/history', icon: History },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0F2642] text-white flex flex-col min-h-screen border-r border-[#0B1A2E] select-none no-print">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1A385C] flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/FIRST LAB.png"
            alt="First Lab"
            className="w-full h-auto object-contain"
          />
        </div>
        <div>
          <h1 className="font-extrabold text-sm tracking-wide text-white leading-tight">
            RACE SAMPLES
          </h1>
          <p className="text-[10px] text-blue-300 tracking-wider uppercase font-medium">
            LABORATORY REPORTING
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1E60AA] text-white shadow-md font-semibold'
                  : 'text-slate-300 hover:bg-[#1A385C]/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold bg-[#E53935] text-white px-2 py-0.5 rounded-full shadow-sm">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Active Thresholds Card */}
      <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-[#0B1A2E]/80 border border-[#1A385C] text-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-2">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>ACTIVE THRESHOLDS</span>
        </div>
        <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>HGB &ge; 14.0 g/dL</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>HCT &ge; 32.0 %</span>
          </div>
        </div>
      </div>

      {/* Logout Footer */}
      <div className="p-3 border-t border-[#1A385C]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
