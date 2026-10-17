'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import {
  TestTubes,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Clock,
  ArrowUpRight,
  Download,
  AlertCircle,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to load dashboard metrics');
      }
      const data = await res.json();
      setStats(data.data);
    } catch (err: any) {
      setError(err.message || 'Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-10 h-10 border-4 border-[#1E60AA] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading laboratory dashboard...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !stats) {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white rounded-xl border border-red-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-800">Unable to load dashboard</h3>
          <p className="text-xs text-slate-600 mt-1">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-[#1E60AA] text-white text-xs font-semibold rounded-lg hover:bg-[#164E8C]"
          >
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  const total = stats.totalSamples || 1; // avoid division by zero
  const bothPos = stats.bothPositive;
  const onlyHgb = Math.max(0, stats.positiveHgb - stats.bothPositive);
  const onlyHct = Math.max(0, stats.positiveHct - stats.bothPositive);
  const neither = stats.neitherPositive;

  const pctBoth = ((bothPos / total) * 100).toFixed(1);
  const pctHgb = ((onlyHgb / total) * 100).toFixed(1);
  const pctHct = ((onlyHct / total) * 100).toFixed(1);
  const pctNeither = ((neither / total) * 100).toFixed(1);

  // SVG Donut calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeBoth = (bothPos / total) * circumference;
  const strokeHgb = (onlyHgb / total) * circumference;
  const strokeHct = (onlyHct / total) * circumference;
  const strokeNeither = (neither / total) * circumference;

  const offsetBoth = 0;
  const offsetHgb = -strokeBoth;
  const offsetHct = -(strokeBoth + strokeHgb);
  const offsetNeither = -(strokeBoth + strokeHgb + strokeHct);

  // Bar chart max scale
  const maxBar = Math.max(bothPos, onlyHgb, onlyHct, neither, 25);

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Banner with High-Resolution Camel Graphic */}
        <div
          className="rounded-2xl p-6 text-white shadow-sm relative overflow-hidden flex items-center justify-between min-h-[140px] bg-[#0C2340] bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/images/camel_banner.jpg')",
            backgroundPosition: "right center",
          }}
        >
          {/* Smooth gradient overlay to ensure crisp contrast on the left while preserving the full camel landscape on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C2340] via-[#0C2340]/75 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <span className="text-[10px] font-bold tracking-widest text-blue-200 uppercase mb-1 block">
              RACE SAMPLES LABORATORY REPORTING
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Camel CBC Laboratory Analysis
            </h1>
            <p className="text-xs text-blue-100/90 mt-1.5 leading-relaxed font-normal max-w-lg">
              Centralized administrative reporting system. Official positivity rule: BOTH Hemoglobin (HGB &ge; 14.0 g/dL) and Hematocrit (HCT &ge; 32.0%) required.
            </p>
          </div>
        </div>

        {/* 6 Metric KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Total Samples */}
          <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Total Samples</div>
            <div className="text-2xl font-black text-[#0F2642] mt-1">{stats.totalSamples}</div>
            <div className="text-[10px] text-slate-400 mt-1">Across all reports</div>
          </div>

          {/* 2. Positive HGB */}
          <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Positive HGB</div>
            <div className="text-2xl font-black text-[#059669] mt-1">{stats.positiveHgb}</div>
            <div className="text-[10px] text-slate-400 mt-1">&ge; 14.0 g/dL</div>
          </div>

          {/* 3. Positive HCT */}
          <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Positive HCT</div>
            <div className="text-2xl font-black text-[#0284C7] mt-1">{stats.positiveHct}</div>
            <div className="text-[10px] text-slate-400 mt-1">&ge; 32.0 %</div>
          </div>

          {/* 4. Both Positive (Red) */}
          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs">
            <div className="text-[11px] font-bold text-[#E53935]">Both Positive</div>
            <div className="text-2xl font-black text-[#E53935] mt-1">{stats.bothPositive}</div>
            <div className="text-[10px] text-slate-400 mt-1">Satisfies both conditions</div>
          </div>

          {/* 5. Neither Positive */}
          <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Neither Positive</div>
            <div className="text-2xl font-black text-slate-700 mt-1">{stats.neitherPositive}</div>
            <div className="text-[10px] text-slate-400 mt-1">Both below threshold</div>
          </div>

          {/* 6. Total Reports */}
          <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500">Total Reports</div>
            <div className="text-2xl font-black text-[#0F2642] mt-1">{stats.totalReports}</div>
            <div className="text-[10px] text-slate-400 mt-1">Active / Archived</div>
          </div>
        </div>

        {/* Middle Section: Donut Distribution & Vertical Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Overall Positivity Distribution (Donut Chart) */}
          <div className="bg-white p-5 rounded-xl border border-[#D9E0E8] shadow-xs">
            <h3 className="text-xs font-bold text-[#0F2642] mb-4">
              Overall Positivity Distribution
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Donut Graphic */}
              <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#E2E8F0"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  {/* Both Positive (Red) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#E53935"
                    strokeWidth="11"
                    strokeDasharray={`${strokeBoth} ${circumference}`}
                    strokeDashoffset={offsetBoth}
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                  {/* Only HGB (Amber/Orange) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#F59E0B"
                    strokeWidth="11"
                    strokeDasharray={`${strokeHgb} ${circumference}`}
                    strokeDashoffset={offsetHgb}
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                  {/* Only HCT (Cyan/Blue) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#06B6D4"
                    strokeWidth="11"
                    strokeDasharray={`${strokeHct} ${circumference}`}
                    strokeDashoffset={offsetHct}
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                  {/* Neither Positive (Gray) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#CBD5E1"
                    strokeWidth="11"
                    strokeDasharray={`${strokeNeither} ${circumference}`}
                    strokeDashoffset={offsetNeither}
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-[#0F2642]">{stats.totalSamples}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Samples</span>
                </div>
              </div>

              {/* Legend with Counts & Percentages */}
              <div className="space-y-2 text-xs flex-1 w-full max-w-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E53935]"></span>
                    <span className="text-slate-700 font-medium">Both Positive</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{bothPos}</span>
                    <span className="text-slate-400 text-[11px] w-12 text-right">{pctBoth}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                    <span className="text-slate-700 font-medium">Only HGB Positive</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{onlyHgb}</span>
                    <span className="text-slate-400 text-[11px] w-12 text-right">{pctHgb}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></span>
                    <span className="text-slate-700 font-medium">Only HCT Positive</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{onlyHct}</span>
                    <span className="text-slate-400 text-[11px] w-12 text-right">{pctHct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]"></span>
                    <span className="text-slate-700 font-medium">Neither Positive</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{neither}</span>
                    <span className="text-slate-400 text-[11px] w-12 text-right">{pctNeither}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Samples Trend by Status (Vertical Bar Chart) */}
          <div className="bg-white p-5 rounded-xl border border-[#D9E0E8] shadow-xs">
            <h3 className="text-xs font-bold text-[#0F2642] mb-4">
              Samples Trend by Status
            </h3>

            <div className="h-40 flex items-end justify-around gap-4 pt-6 px-4 border-b border-slate-200">
              {/* Bar 1: Both Positive */}
              <div className="flex flex-col items-center flex-1 h-full justify-end">
                <span className="text-[11px] font-bold text-[#E53935] mb-1">{bothPos}</span>
                <div
                  style={{ height: `${Math.max(6, (bothPos / maxBar) * 100)}%` }}
                  className="w-10 sm:w-12 bg-[#E53935] rounded-t-md transition-all duration-700"
                ></div>
              </div>

              {/* Bar 2: Only HGB */}
              <div className="flex flex-col items-center flex-1 h-full justify-end">
                <span className="text-[11px] font-bold text-[#F59E0B] mb-1">{onlyHgb}</span>
                <div
                  style={{ height: `${Math.max(6, (onlyHgb / maxBar) * 100)}%` }}
                  className="w-10 sm:w-12 bg-[#F59E0B] rounded-t-md transition-all duration-700"
                ></div>
              </div>

              {/* Bar 3: Only HCT */}
              <div className="flex flex-col items-center flex-1 h-full justify-end">
                <span className="text-[11px] font-bold text-[#06B6D4] mb-1">{onlyHct}</span>
                <div
                  style={{ height: `${Math.max(6, (onlyHct / maxBar) * 100)}%` }}
                  className="w-10 sm:w-12 bg-[#06B6D4] rounded-t-md transition-all duration-700"
                ></div>
              </div>

              {/* Bar 4: Neither */}
              <div className="flex flex-col items-center flex-1 h-full justify-end">
                <span className="text-[11px] font-bold text-slate-600 mb-1">{neither}</span>
                <div
                  style={{ height: `${Math.max(6, (neither / maxBar) * 100)}%` }}
                  className="w-10 sm:w-12 bg-[#CBD5E1] rounded-t-md transition-all duration-700"
                ></div>
              </div>
            </div>

            <div className="flex justify-around text-center text-[10px] font-semibold text-slate-500 mt-2">
              <span className="flex-1">Both Positive</span>
              <span className="flex-1">Only HGB</span>
              <span className="flex-1">Only HCT</span>
              <span className="flex-1">Neither</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Reports (2/3) & System Activity Log (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Reports Table (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0F2642]">
                Recent Generated Reports
              </h3>
              <Link
                href="/reports"
                className="text-xs font-semibold text-[#1E60AA] hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F2642] text-white">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Report No</th>
                    <th className="py-2.5 px-4 font-semibold">Title / Event</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Samples</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Both Positive</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentReports.length > 0 ? (
                    stats.recentReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#1E60AA]">
                          <Link href={`/reports/${r.id}`} className="hover:underline">
                            {r.reportNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{r.title}</div>
                          <div className="text-[10px] text-slate-400 font-arabic">{r.recipientName}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {r.totalSamples}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-[#E53935] px-2 py-0.5 rounded-md bg-red-50 border border-red-200">
                            {r.bothPositiveCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="positive">
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-slate-400">
                            <Link
                              href={`/reports/${r.id}`}
                              className="p-1 hover:text-[#1E60AA] hover:bg-slate-100 rounded"
                              title="View Report"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <a
                              href={`/api/reports/${r.id}/export/pdf`}
                              className="p-1 hover:text-[#E53935] hover:bg-slate-100 rounded"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`/api/reports/${r.id}/export/excel`}
                              className="p-1 hover:text-emerald-600 hover:bg-slate-100 rounded"
                              title="Download Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: System Activity Log (1 col) */}
          <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-[#0F2642]">
                System Activity Log
              </h3>
            </div>

            <div className="p-4 flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[300px]">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((act) => (
                  <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-bold text-slate-800 text-[11px]">{act.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-0.5 pl-5 truncate">
                      {act.details && act.details.startsWith('{')
                        ? 'Operation completed'
                        : act.details || 'System event recorded'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No activity logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
