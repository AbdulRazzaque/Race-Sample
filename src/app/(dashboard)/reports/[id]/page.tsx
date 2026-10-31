'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { PositivityStatus } from '@/types';

interface ReportDetail {
  id: string;
  reportNumber: string;
  title: string;
  organizationNameSnapshot: string;
  recipientName: string;
  sampleReceiptDate: string;
  generatedAt: string;
  originalFileName: string;
  ageCategory: string | null;
  batchIdentifier: string | null;
  totalSamples: number;
  positiveHgbCount: number;
  positiveHctCount: number;
  bothPositiveCount: number;
  hgbThreshold: number;
  hctThreshold: number;
  status: string;
  samples: {
    id: string;
    sampleCode: string;
    rowNumber: number;
    hgbValue: number;
    hgbStatus: PositivityStatus;
    hctValue: number;
    hctStatus: PositivityStatus;
    bothPositive: boolean;
  }[];
}

export default function FormalReportPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'full' | 'positive' | 'negative'>('full');

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Report not found');
        return res.json();
      })
      .then((data) => setReport(data.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#173B65]" />
          <p className="text-xs text-slate-500 font-semibold">Generating formal laboratory report preview...</p>
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white rounded-xl border border-red-200">
          <h2 className="text-lg font-bold text-red-700">Report Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">The requested report ID could not be loaded.</p>
          <Link
            href="/reports"
            className="mt-4 inline-block px-4 py-2 bg-[#173B65] text-white rounded-lg text-xs font-semibold"
          >
            Back to Reports
          </Link>
        </div>
      </AppShell>
    );
  }

  const positiveSamplesOnly = report.samples
    .filter((s) => s.hgbStatus === 'POSITIVE' || s.hctStatus === 'POSITIVE')
    .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));

  const negativeSamplesOnly = report.samples
    .filter((s) => s.hgbStatus !== 'POSITIVE' || s.hctStatus !== 'POSITIVE')
    .sort((a, b) => a.sampleCode.localeCompare(b.sampleCode));

  const negativeCount = negativeSamplesOnly.length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Navigation & Action Bar (Hidden on print) */}
        <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="p-2 text-slate-500 hover:text-[#173B65] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#173B65] text-sm">
                  {report.reportNumber}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-[#173B65] border border-blue-200">
                  {report.samples.length} Samples
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-50 text-[#E53935] border border-red-200">
                  {positiveSamplesOnly.length} Positive
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                  {negativeCount} Negative
                </span>
              </div>
              <h1 className="text-xs text-slate-500 mt-0.5">
                Official Laboratory Report Preview &amp; Export
              </h1>
            </div>
          </div>

          {/* View Mode Toggle & Downloads */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('full')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${viewMode === 'full'
                  ? 'bg-[#173B65] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Full Results (7 cols)
              </button>
              <button
                onClick={() => setViewMode('positive')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${viewMode === 'positive'
                  ? 'bg-[#E53935] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Positive Only (4 cols)
              </button>
              <button
                onClick={() => setViewMode('negative')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${viewMode === 'negative'
                  ? 'bg-[#173B65] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Negative Only (4 cols)
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold bg-white text-[#173B65] border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Excel Download */}
            <a
              href={
                viewMode === 'full'
                  ? `/api/reports/${report.id}/export/excel`
                  : viewMode === 'positive'
                    ? `/api/reports/${report.id}/export/positive/excel`
                    : `/api/reports/${report.id}/export/negative/excel`
              }
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </a>

            {/* PDF Download */}
            <a
              href={
                viewMode === 'full'
                  ? `/api/reports/${report.id}/export/pdf`
                  : viewMode === 'positive'
                    ? `/api/reports/${report.id}/export/positive/pdf`
                    : `/api/reports/${report.id}/export/negative/pdf`
              }
              className="px-3.5 py-1.5 text-xs font-bold bg-[#E53935] hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </a>
          </div>
        </div>

        {/* 
          FORMAL LABORATORY REPORT DOCUMENT (A4 Preview & Print)
          Precisely matches Reference Image 1 (Full) and Reference Image 2 (Positive)
        */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-300 max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:rounded-none">
          {/* 1. TOP HEADER WITH LOGOS & ARABIC TITLE */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            {/* Left: First Lab Logo */}
            <div className="w-28 sm:w-36 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/FIRST LAB.png"
                alt="First Lab"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Center: Title & Subtitle */}
            <div className="text-center flex-1 px-4">
              <h2 className="text-lg sm:text-2xl font-black text-[#173B65] font-arabic">
                تحليل فحص صورة الدم (CBC)
              </h2>
              <div className="text-sm sm:text-lg font-bold text-[#E53935] mt-0.5 font-arabic">
                {report.title || 'المهرجان الصيفي'}
              </div>
            </div>

            {/* Right: Committee Emblem */}
            <div className="w-20 sm:w-24 flex-shrink-0 flex justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/COMMITTEE LOGO.jpg"
                alt="Camel Racing Committee"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full shadow-sm"
              />
            </div>
          </div>

          {/* 2. METADATA INFO PANEL & RECIPIENT */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left (8 cols): Rounded Information Table (RTL oriented as in reference image) */}
            <div className="md:col-span-7 border-2 border-slate-800 rounded-2xl overflow-hidden bg-white text-xs font-arabic shadow-sm">
              <div className="grid grid-cols-12 divide-y divide-slate-800">
                {/* Row 1: Report Number */}
                <div className="col-span-8 p-1.5 text-center font-mono font-bold text-[#173B65] border-r border-slate-800">
                  {report.reportNumber}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  تقرير رقم:
                </div>

                {/* Row 2: Receipt Date */}
                <div className="col-span-8 p-1.5 text-center font-bold text-slate-700 border-r border-slate-800">
                  {new Date(report.sampleReceiptDate).toLocaleDateString('en-GB')} 7:00AM
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  تاريخ استلام العينات:
                </div>

                {/* Row 3: Issue Date */}
                <div className="col-span-8 p-1.5 text-center font-bold text-slate-700 border-r border-slate-800">
                  {new Date(report.generatedAt).toLocaleString('en-GB')}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  تاريخ ووقت الاصدار:
                </div>

                {/* Row 4: Camel Age/Category */}
                <div className="col-span-8 p-1.5 text-center font-bold text-slate-700 border-r border-slate-800">
                  {report.ageCategory || 'حقائق'}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  سن المطايا:
                </div>

                {/* Row 5: Batch Group */}
                <div className="col-span-8 p-1.5 text-center font-mono font-bold text-slate-700 border-r border-slate-800">
                  {report.batchIdentifier || 'FL-25-0001-0085'}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  المجموعه:
                </div>

                {/* Row 6: Total Samples */}
                <div className="col-span-8 p-1.5 text-center font-bold text-slate-800 text-sm border-r border-slate-800">
                  {report.totalSamples}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  إجمالي عدد العينات:
                </div>

                {/* Row 7: Number of Positive Samples (IN RED BOLD!) */}
                <div className="col-span-8 p-1.5 text-center font-black text-[#E53935] text-base border-r border-slate-800">
                  {positiveSamplesOnly.length}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  عدد العينات الإيجابية:
                </div>

                {/* Row 8: Number of Negative Samples */}
                <div className="col-span-8 p-1.5 text-center font-bold text-[#173B65] text-base border-r border-slate-800">
                  {negativeCount}
                </div>
                <div className="col-span-4 p-1.5 text-right font-bold text-slate-800 pr-3">
                  عدد العينات السلبية:
                </div>
              </div>
            </div>

            {/* Right (5 cols): Recipient Name */}
            <div className="md:col-span-5 text-right font-arabic">
              <div className="text-sm font-bold text-slate-900 leading-relaxed">
                {report.recipientName || 'الساده/ اللجنة المنظمة لسباق الهجن'}
              </div>
            </div>
          </div>

          {/* 3. THRESHOLD EXPLANATION BANNER */}
          <div
            dir="rtl"
            className="mt-4 border-2 border-slate-800 rounded-xl p-2.5 text-center font-arabic text-xs leading-relaxed bg-white"
          >
            <span>تُعتبر العينات </span>
            <span className="font-extrabold text-[#E53935] underline">إيجابية</span>
            <span> وفقًا لاشتراطات اللجنة المنظمة لسباقات الهجن إذا تجاوزت أو بلغت القيم المحددة للهيموجلوبين </span>
            <bdi dir="ltr" className="font-bold font-sans">
              (HGB)
            </bdi>
            <span> والهيماتوكريت </span>
            <bdi dir="ltr" className="font-bold font-sans">
              (HCT)
            </bdi>
            <span> معا، وذلك وفقًا للحدود </span>
            <bdi dir="ltr" className="font-black text-[#E53935] underline font-mono">
              (HGB &ge; {report.hgbThreshold || 14}, HCT &ge; {report.hctThreshold || 32})
            </bdi>
          </div>

          {/* 4. SECTION TITLE */}
          <div className="mt-5 mb-2 text-center">
            {viewMode === 'full' ? (
              <h3 className="text-lg font-black text-slate-900 underline font-arabic tracking-wider">
                النتائج الإجمالية
              </h3>
            ) : viewMode === 'positive' ? (
              <h3 className="text-lg font-black text-[#E53935] underline font-arabic tracking-wider">
                المطايا الإيجابية
              </h3>
            ) : (
              <h3 className="text-lg font-black text-[#173B65] underline font-arabic tracking-wider">
                المطايا السلبية
              </h3>
            )}
          </div>

          {/* 5. FORMAL RESULTS TABLE */}
          {viewMode === 'full' ? (
            /* FULL RESULTS TABLE (7 COLUMNS MATCHING REFERENCE 1) */
            <div className="overflow-x-auto">
              <table className="w-full text-center text-[11px] sm:text-xs border-collapse border border-slate-800">
                <thead className="bg-[#173B65] text-white">
                  <tr>
                    <th className="py-2 px-2 border border-slate-800 font-bold w-12">SN</th>
                    <th className="py-2 px-3 border border-slate-800 font-bold">SAMPLE CODE</th>
                    <th className="py-2 px-2 border border-slate-800 font-bold">
                      HGB <br />
                      <span className="text-[10px] font-normal">(g/dL)</span>
                    </th>
                    <th className="py-2 px-3 border border-slate-800 font-bold">HGB STATUS</th>
                    <th className="py-2 px-2 border border-slate-800 font-bold">HCT</th>
                    <th className="py-2 px-3 border border-slate-800 font-bold">HCT STATUS</th>
                    <th className="py-2 px-3 border border-slate-800 font-bold">BOTH POSITIVE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {report.samples.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-1 px-2 border border-slate-800 font-semibold text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-3 border border-slate-800 font-mono font-bold text-slate-800">
                        {s.sampleCode}
                      </td>
                      <td className="py-1 px-2 border border-slate-800 font-semibold text-slate-800">
                        {s.hgbValue.toFixed(1)}
                      </td>
                      <td
                        className={`py-1 px-3 border border-slate-800 font-bold ${s.hgbStatus === 'POSITIVE' ? 'text-[#E53935]' : 'text-[#285783]'
                          }`}
                      >
                        {s.hgbStatus}
                      </td>
                      <td className="py-1 px-2 border border-slate-800 font-semibold text-slate-800">
                        {s.hctValue.toFixed(1)}
                      </td>
                      <td
                        className={`py-1 px-3 border border-slate-800 font-bold ${s.hctStatus === 'POSITIVE' ? 'text-[#E53935]' : 'text-[#285783]'
                          }`}
                      >
                        {s.hctStatus}
                      </td>
                      <td className="py-1 px-3 border border-slate-800 font-black text-[#E53935]">
                        {s.bothPositive ? 'YES' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'positive' ? (
            /* POSITIVE ONLY TABLE (4 COLUMNS MATCHING REFERENCE 2) */
            <div className="overflow-x-auto max-w-2xl mx-auto">
              <table className="w-full text-center text-xs border-collapse border border-slate-800">
                <thead className="bg-[#173B65] text-white">
                  <tr>
                    <th className="py-2 px-3 border border-slate-800 font-bold w-14">SN</th>
                    <th className="py-2 px-6 border border-slate-800 font-bold">SAMPLE CODE</th>
                    <th className="py-2 px-6 border border-slate-800 font-bold">HGB (g/dL)</th>
                    <th className="py-2 px-6 border border-slate-800 font-bold">HCT (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {positiveSamplesOnly.length > 0 ? (
                    positiveSamplesOnly.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-red-50/20">
                        <td className="py-1.5 px-3 border border-slate-800 font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-6 border border-slate-800 font-mono font-bold text-slate-800">
                          {s.sampleCode}
                        </td>
                        {/* Red bold font for positive measurements, empty cell if negative */}
                        <td className="py-1.5 px-6 border border-slate-800 font-black text-[#E53935] text-sm">
                          {s.hgbStatus === 'POSITIVE' ? s.hgbValue.toFixed(1) : ''}
                        </td>
                        <td className="py-1.5 px-6 border border-slate-800 font-black text-[#E53935] text-sm">
                          {s.hctStatus === 'POSITIVE' ? s.hctValue.toFixed(1) : ''}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No samples satisfied both positive criteria in this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* NEGATIVE ONLY TABLE (4 COLUMNS) */
            <div className="overflow-x-auto max-w-2xl mx-auto">
              <table className="w-full text-center text-xs border-collapse border border-slate-800">
                <thead className="bg-[#173B65] text-white">
                  <tr>
                    <th className="py-2 px-3 border border-slate-800 font-bold w-14">SN</th>
                    <th className="py-2 px-6 border border-slate-800 font-bold">SAMPLE CODE</th>
                    <th className="py-2 px-6 border border-slate-800 font-bold">HGB (g/dL)</th>
                    <th className="py-2 px-6 border border-slate-800 font-bold">HCT (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {negativeSamplesOnly.length > 0 ? (
                    negativeSamplesOnly.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 border border-slate-800 font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-6 border border-slate-800 font-mono font-bold text-slate-800">
                          {s.sampleCode}
                        </td>
                        {/* Normal font for negative measurements, empty cell if positive */}
                        <td className="py-1.5 px-6 border border-slate-800 font-semibold text-slate-800 text-sm">
                          {s.hgbStatus !== 'POSITIVE' ? s.hgbValue.toFixed(1) : ''}
                        </td>
                        <td className="py-1.5 px-6 border border-slate-800 font-semibold text-slate-800 text-sm">
                          {s.hctStatus !== 'POSITIVE' ? s.hctValue.toFixed(1) : ''}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No negative samples in this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. BOTTOM FOOTER WITH VALIDATED STAMP */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-end justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Page 1 of{' '}
              {Math.max(
                1,
                Math.ceil(
                  (viewMode === 'positive'
                    ? positiveSamplesOnly.length
                    : viewMode === 'negative'
                      ? negativeSamplesOnly.length
                      : report.samples.length) / 26
                )
              )}
            </div>

            {/* Validated Stamp matching Reference Image 2 */}
            <div className="w-28 sm:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/stamp.jpeg"
                alt="Validated Stamp"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
