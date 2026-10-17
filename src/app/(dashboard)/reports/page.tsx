'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  Download,
  Archive,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { ReportSummary } from '@/types';

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReports = async () => {
    setLoading(true);
    const query = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    });
    if (search.trim()) query.set('search', search.trim());
    if (status !== 'all') query.set('status', status);

    try {
      const res = await fetch(`/api/reports?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleToggleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to toggle the archive status of this report?')) return;
    try {
      const res = await fetch(`/api/reports/${id}/archive`, { method: 'POST' });
      if (res.ok) {
        fetchReports();
      }
    } catch {}
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Search & Actions Bar matching Bottom-Left Screenshot */}
        <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Report Number, Event, or Recipient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0F2642] hover:bg-[#1A385C] text-white text-xs font-bold rounded-lg"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Status:</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
              >
                <option value="all">All Reports</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            <Link
              href="/import"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E60AA] hover:bg-[#164E8C] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import New Report</span>
            </Link>
          </div>
        </div>

        {/* Reports Table matching Bottom-Left Screenshot */}
        <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F2642] text-white">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Report No</th>
                  <th className="py-2.5 px-4 font-semibold">Event / Title</th>
                  <th className="py-2.5 px-4 font-semibold">Recipient</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Samples</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Pos HGB</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Pos HCT</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Both Positive</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Thresholds</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1E60AA]" />
                      <span>Loading reports...</span>
                    </td>
                  </tr>
                ) : reports.length > 0 ? (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#1E60AA]">
                        <Link href={`/reports/${r.id}`} className="hover:underline">
                          {r.reportNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 font-arabic">{r.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(r.sampleReceiptDate).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-arabic">{r.recipientName}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {r.totalSamples}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {r.positiveHgbCount}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {r.positiveHctCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-[#E53935] px-2 py-0.5 rounded-md bg-red-50 border border-red-200">
                          {r.bothPositiveCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                        &ge;{r.hgbThreshold} / &ge;{r.hctThreshold}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={r.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-slate-400">
                          <Link
                            href={`/reports/${r.id}`}
                            className="p-1 hover:text-[#0F2642] hover:bg-slate-100 rounded"
                            title="Open Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <a
                            href={`/api/reports/${r.id}/export/excel`}
                            className="p-1 hover:text-emerald-700 hover:bg-slate-100 rounded"
                            title="Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`/api/reports/${r.id}/export/pdf`}
                            className="p-1 hover:text-red-600 hover:bg-slate-100 rounded"
                            title="PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleToggleArchive(r.id)}
                            className="p-1 hover:text-amber-600 hover:bg-slate-100 rounded"
                            title={r.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="py-3 px-5 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-center gap-1 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                  page === p
                    ? 'bg-[#1E60AA] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
