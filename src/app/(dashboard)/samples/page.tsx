'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Search,
  Download,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Eye,
} from 'lucide-react';
import { PositivityStatus } from '@/types';

interface SampleRow {
  id: string;
  reportId: string;
  reportNumber: string;
  sampleCode: string;
  rowNumber: number;
  hgbValue: number;
  hgbStatus: PositivityStatus;
  hctValue: number;
  hctStatus: PositivityStatus;
  bothPositive: boolean;
  createdAt: string;
}

export default function AllSamplesPage() {
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [reportId, setReportId] = useState('all');
  const [hgbStatus, setHgbStatus] = useState('all');
  const [hctStatus, setHctStatus] = useState('all');
  const [bothPositive, setBothPositive] = useState('all');
  const [sortBy, setSortBy] = useState<'sampleCode' | 'rowNumber' | 'hgbValue' | 'hctValue'>('rowNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Available Reports
  const [reportsList, setReportsList] = useState<{ id: string; reportNumber: string }[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit Modal State
  const [editingSample, setEditingSample] = useState<SampleRow | null>(null);
  const [viewingSample, setViewingSample] = useState<SampleRow | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editHgb, setEditHgb] = useState<number>(0);
  const [editHct, setEditHct] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Export State
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        setReportsList(data.reports.map((r: any) => ({ id: r.id, reportNumber: r.reportNumber })));
      }
    } catch {}
  };

  const fetchSamples = async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortOrder,
    });

    if (search.trim()) query.set('search', search.trim());
    if (reportId !== 'all') query.set('reportId', reportId);
    if (hgbStatus !== 'all') query.set('hgbStatus', hgbStatus);
    if (hctStatus !== 'all') query.set('hctStatus', hctStatus);
    if (bothPositive !== 'all') query.set('bothPositive', bothPositive);

    try {
      const res = await fetch(`/api/samples?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch samples');
      const data = await res.json();
      setSamples(data.samples);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'Error fetching sample records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    fetchSamples();
  }, [page, pageSize, reportId, hgbStatus, hctStatus, bothPositive, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSamples();
  };

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.size === samples.length && samples.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(samples.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Edit Action
  const openEditModal = (sample: SampleRow) => {
    setEditingSample(sample);
    setEditCode(sample.sampleCode);
    setEditHgb(sample.hgbValue);
    setEditHct(sample.hctValue);
  };

  const handleSaveEdit = async () => {
    if (!editingSample) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/samples/${editingSample.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleCode: editCode,
          hgbValue: editHgb,
          hctValue: editHct,
        }),
      });

      if (!res.ok) throw new Error('Failed to update sample');
      setEditingSample(null);
      fetchSamples();
    } catch (err: any) {
      alert(err.message || 'Error updating sample');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Action
  const handleDeleteSample = async () => {
    if (!deletingId) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/samples/${deletingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete sample');
      setDeletingId(null);
      fetchSamples();
    } catch (err: any) {
      alert(err.message || 'Error deleting sample');
    } finally {
      setDeleting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async (exportSelected: boolean) => {
    setExporting(true);
    try {
      const payload: any = {};
      if (exportSelected) {
        payload.sampleIds = Array.from(selectedIds);
      } else {
        payload.filters = {
          reportId: reportId !== 'all' ? reportId : undefined,
          search: search.trim() || undefined,
          hgbStatus: hgbStatus !== 'all' ? hgbStatus : undefined,
          hctStatus: hctStatus !== 'all' ? hctStatus : undefined,
          bothPositive: bothPositive !== 'all' ? bothPositive : undefined,
        };
      }

      const res = await fetch('/api/samples/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportSelected
        ? `RACE_SAMPLES_Selected_${selectedIds.size}_Records.xlsx`
        : `RACE_SAMPLES_Filtered_Dataset.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Export error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Filter Controls Card matching Middle-Left screenshot */}
        <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Sample Code (e.g. FL-25-001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#0F2642] focus:ring-1 focus:ring-[#1E60AA]"
              />
            </div>

            {/* Row of Dropdown Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Report</label>
                <select
                  value={reportId}
                  onChange={(e) => {
                    setReportId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
                >
                  <option value="all">All Reports</option>
                  {reportsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.reportNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">HGB Status</label>
                <select
                  value={hgbStatus}
                  onChange={(e) => {
                    setHgbStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
                >
                  <option value="all">All HGB Statuses</option>
                  <option value="POSITIVE">POSITIVE (&ge; 14)</option>
                  <option value="NEGATIVE">NEGATIVE (&lt; 14)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">HCT Status</label>
                <select
                  value={hctStatus}
                  onChange={(e) => {
                    setHctStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
                >
                  <option value="all">All HCT Statuses</option>
                  <option value="POSITIVE">POSITIVE (&ge; 32)</option>
                  <option value="NEGATIVE">NEGATIVE (&lt; 32)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Both Positive</label>
                <select
                  value={bothPositive}
                  onChange={(e) => {
                    setBothPositive(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
                >
                  <option value="all">All Samples</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#0F2642] hover:bg-[#1A385C] text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Table Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Showing <span className="font-bold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(page * pageSize, totalCount)}</span> of{' '}
            <span className="font-bold text-slate-800">{totalCount}</span> total samples
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <button
              onClick={() => handleExportExcel(false)}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#1E60AA] hover:bg-[#164E8C] text-white rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export All Filtered</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-[#0F2642] text-white">
                <tr>
                  <th className="py-2.5 px-3 w-10">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center">
                      {selectedIds.size === samples.length && samples.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-blue-200" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-2 font-semibold">SN</th>
                  <th className="py-2.5 px-3 font-semibold">REPORT</th>
                  <th className="py-2.5 px-4 font-semibold">SAMPLE CODE</th>
                  <th className="py-2.5 px-3 font-semibold">HGB (g/dL)</th>
                  <th className="py-2.5 px-3 font-semibold">HGB STATUS</th>
                  <th className="py-2.5 px-3 font-semibold">HCT (%)</th>
                  <th className="py-2.5 px-3 font-semibold">HCT STATUS</th>
                  <th className="py-2.5 px-3 font-semibold">BOTH POSITIVE</th>
                  <th className="py-2.5 px-3 font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1E60AA]" />
                      <span>Loading sample records...</span>
                    </td>
                  </tr>
                ) : samples.length > 0 ? (
                  samples.map((s) => {
                    const isSelected = selectedIds.has(s.id);

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-blue-50/20 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3">
                          <button
                            onClick={() => toggleSelectOne(s.id)}
                            className="flex items-center justify-center mx-auto"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#1E60AA]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-2 font-semibold text-slate-600">
                          {s.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {s.reportNumber}
                        </td>
                        <td className="py-2 px-4 font-mono font-bold text-[#0F2642]">
                          {s.sampleCode}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {s.hgbValue.toFixed(1)}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={s.hgbStatus === 'POSITIVE' ? 'positive' : 'negative'}>
                            {s.hgbStatus}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {s.hctValue.toFixed(1)}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={s.hctStatus === 'POSITIVE' ? 'positive' : 'negative'}>
                            {s.hctStatus}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {s.bothPositive ? (
                            <span className="font-bold text-[#E53935]">YES</span>
                          ) : (
                            <span className="text-slate-400 font-medium">NO</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1.5 text-slate-400">
                            <button
                              onClick={() => setViewingSample(s)}
                              className="p-1 hover:text-[#0F2642] hover:bg-slate-100 rounded"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1 hover:text-[#1E60AA] hover:bg-slate-100 rounded"
                              title="Edit Sample"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(s.id)}
                              className="p-1 hover:text-red-600 hover:bg-slate-100 rounded"
                              title="Delete Sample"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No sample records found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls matching Middle-Left screenshot: ‹ 1 2 3 4 5 › */}
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

        {/* View Details Modal */}
        {viewingSample && (
          <Modal
            isOpen={true}
            onClose={() => setViewingSample(null)}
            title={`Sample Details: ${viewingSample.sampleCode}`}
            maxWidth="md"
          >
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Report Number</span>
                  <span className="font-bold text-slate-800">{viewingSample.reportNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Sample Code</span>
                  <span className="font-bold text-[#0F2642] font-mono">{viewingSample.sampleCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hemoglobin (HGB)</span>
                  <span className="font-bold text-slate-800">{viewingSample.hgbValue} g/dL ({viewingSample.hgbStatus})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hematocrit (HCT)</span>
                  <span className="font-bold text-slate-800">{viewingSample.hctValue}% ({viewingSample.hctStatus})</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block">Both Positive Status</span>
                  <span className={`font-black text-sm ${viewingSample.bothPositive ? 'text-[#E53935]' : 'text-slate-600'}`}>
                    {viewingSample.bothPositive ? 'YES (Satisfies official regulation)' : 'NO'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewingSample(null)}
                  className="px-4 py-1.5 bg-[#0F2642] text-white rounded-lg font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Modal */}
        {editingSample && (
          <Modal
            isOpen={true}
            onClose={() => setEditingSample(null)}
            title={`Edit Sample ${editingSample.sampleCode}`}
            maxWidth="md"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sample Code
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HGB (g/dL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editHgb}
                  onChange={(e) => setEditHgb(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HCT (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editHct}
                  onChange={(e) => setEditHct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-blue-50 text-[#0F2642] rounded-lg text-[11px]">
                Note: Positivity statuses will be automatically recalculated using the original report's threshold snapshot.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditingSample(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 bg-[#1E60AA] text-white rounded-lg text-xs font-bold hover:bg-[#164E8C]"
                >
                  {savingEdit ? 'Saving...' : 'Save & Recalculate'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <Modal
            isOpen={true}
            onClose={() => setDeletingId(null)}
            title="Confirm Deletion"
            maxWidth="sm"
          >
            <div className="space-y-4 text-center">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-xs text-slate-600">
                Are you sure you want to delete this sample record? The report's summary statistics will be automatically recalculated.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingId(null)}
                  disabled={deleting}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSample}
                  disabled={deleting}
                  className="px-4 py-2 bg-[#E53935] text-white rounded-lg text-xs font-bold hover:bg-red-700"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
