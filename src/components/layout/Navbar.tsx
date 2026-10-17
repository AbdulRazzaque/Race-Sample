'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UploadCloud, FileText, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [username, setUsername] = useState<string>('admin');

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user?.username) {
          setUsername(data.user.username);
        }
      })
      .catch(() => { });
  }, []);

  const getPageTitle = (path: string) => {
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/import')) return 'Import Laboratory Excel';
    if (path.startsWith('/positive-samples')) return 'Positive Samples Report';
    if (path.startsWith('/samples')) return 'All Sample Records';
    if (path.startsWith('/reports/')) return 'Formal Report Preview';
    if (path.startsWith('/reports')) return 'Generated Reports';
    if (path.startsWith('/history')) return 'Import History';
    if (path.startsWith('/settings')) return 'System Settings & Thresholds';
    return 'Laboratory Management';
  };

  return (
    <header className="h-16 bg-white border-b border-[#D9E0E8] px-6 flex items-center justify-between shadow-xs sticky top-0 z-30 no-print">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-[#0F2642] tracking-tight">
          {getPageTitle(pathname)}
        </h2>
      </div>

      {/* Action Buttons & Admin Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/import"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1E60AA] hover:bg-[#164E8C] text-white shadow-sm transition-all"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Excel</span>
        </Link>

        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-xs transition-all"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>View Reports</span>
        </Link>

        {/* Admin Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#0F2642] text-white flex items-center justify-center font-bold text-xs shadow-inner">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left text-xs leading-tight">
            <div className="font-bold text-[#0F2642]">{username}</div>
            <div className="text-[10px] text-slate-400">Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
};
