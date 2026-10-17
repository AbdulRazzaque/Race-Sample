'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  CheckCircle2,
  Search,
  Printer,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Check,
} from 'lucide-react';

interface PositiveSampleRow {
  id: string;
  reportId: string;
  reportNumber: string;
  sampleCode: string;
  sn: number;
  hgbValue: number;
  hctValue: number;
}

export default function PositiveSamplesPage() {
  const [samples, setSamples] = useState<PositiveSampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [reportId, setReportId] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Summary Metrics
  const [summaryStats, setSummaryStats] = useState({
    minHgb: 14.0,
    maxHgb: 16.4,
    minHct: 32.3,
    maxHct: 36.9,
  });

  // Available Reports
  const [reportsList, setReportsList] = useState<{ id: string; reportNumber: string }[]>([]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        setReportsList(data.reports.map((r: any) => ({ id: r.id, reportNumber: r.reportNumber })));
      }
    } catch {}
  };

  const fetchPositiveSamples = async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search.trim()) query.set('search', search.trim());
    if (reportId !== 'all') query.set('reportId', reportId);

    try {
      const res = await fetch(`/api/samples/positive?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to load positive samples');
      const data = await res.json();
      const loaded: PositiveSampleRow[] = data.samples;
      setSamples(loaded);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.totalCount || 0);

      // Compute min/max
      if (loaded.length > 0) {
        const hgbs = loaded.map((s) => s.hgbValue);
        const hcts = loaded.map((s) => s.hctValue);
        setSummaryStats({
          minHgb: Math.min(...hgbs),
          maxHgb: Math.max(...hgbs),
          minHct: Math.min(...hcts),
          maxHct: Math.max(...hcts),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching positive samples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    fetchPositiveSamples();
  }, [page, pageSize, reportId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPositiveSamples();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Top Header matching Middle-Right Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b border-slate-200 no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E53935]">
                OFFICIAL FILTERED REPORT
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#E53935]">
                {totalCount} Total Both Positive
              </span>
            </div>
            <h1 className="text-xl font-black text-[#0F2642]">
              Positive Samples Report (المطايا الإيجابية)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Displays ONLY samples satisfying BOTH HGB &ge; 14.0 g/dL and HCT &ge; 32.0%. Sequentially numbered starting from 1.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {reportsList[0] && (
              <a
                href={`/api/reports/${reportId !== 'all' ? reportId : reportsList[0].id}/export/positive/pdf`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#E53935] hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Latest PDF</span>
              </a>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-[#D9E0E8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search positive sample code..."
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

          <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
            <span className="font-semibold text-slate-600">Report Batch:</span>
            <select
              value={reportId}
              onChange={(e) => {
                setReportId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            >
              <option value="all">All Reports ({totalCount} positives)</option>
              {reportsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reportNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column Content Layout matching Middle-Right Screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Left Column (8 cols): Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead className="bg-[#0F2642] text-white">
                  <tr>
                    <th className="py-2.5 px-4 font-bold w-16">SN</th>
                    <th className="py-2.5 px-6 font-bold">SAMPLE CODE</th>
                    <th className="py-2.5 px-6 font-bold">HGB (g/dL)</th>
                    <th className="py-2.5 px-6 font-bold">HCT (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1E60AA]" />
                        <span>Loading positive samples...</span>
                      </td>
                    </tr>
                  ) : samples.length > 0 ? (
                    samples.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-600">
                          {s.sn}
                        </td>
                        <td className="py-2.5 px-6 font-mono font-bold text-[#0F2642]">
                          {s.sampleCode}
                        </td>
                        <td className="py-2.5 px-6 font-bold text-[#E53935]">
                          {s.hgbValue.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-6 font-bold text-[#E53935]">
                          {s.hctValue.toFixed(1)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No positive samples found matching selection.
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

          {/* Right Column (4 cols): Summary Cards */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Report Summary */}
            <div className="bg-white p-5 rounded-xl border border-[#D9E0E8] shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-[#0F2642]">
                Report Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Total Both Positive</span>
                  </div>
                  <span className="font-bold text-slate-900">{totalCount}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span>Min HGB (g/dL)</span>
                  </div>
                  <span className="font-bold text-slate-900">{summaryStats.minHgb.toFixed(1)}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span>Max HGB (g/dL)</span>
                  </div>
                  <span className="font-bold text-slate-900">{summaryStats.maxHgb.toFixed(1)}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <span>Min HCT (%)</span>
                  </div>
                  <span className="font-bold text-slate-900">{summaryStats.minHct.toFixed(1)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <span>Max HCT (%)</span>
                  </div>
                  <span className="font-bold text-slate-900">{summaryStats.maxHct.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Criteria */}
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Criteria</span>
              </div>
              <div className="space-y-1 text-emerald-800 font-mono text-[11px] pt-1">
                <div>HGB &ge; 14.0 g/dL</div>
                <div>HCT &ge; 32.0 %</div>
              </div>
              <p className="text-[11px] text-emerald-700/80 pt-1">
                Both conditions must be satisfied.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
