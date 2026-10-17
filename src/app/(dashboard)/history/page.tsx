'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { History, FileSpreadsheet, AlertTriangle, Eye, CheckCircle2, Clock } from 'lucide-react';

interface ImportJobItem {
  id: string;
  reportId: string | null;
  originalFileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  duplicateRows: number;
  createdAt: string;
  completedAt: string | null;
  _count?: { errors: number };
}

export default function ImportHistoryPage() {
  const [jobs, setJobs] = useState<ImportJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedErrorJobId, setSelectedErrorJobId] = useState<string | null>(null);
  const [jobErrors, setJobErrors] = useState<any[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/imports');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.data);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openErrorsModal = async (jobId: string) => {
    setSelectedErrorJobId(jobId);
    setLoadingErrors(true);
    try {
      const res = await fetch(`/api/imports/${jobId}/errors`);
      if (res.ok) {
        const data = await res.json();
        setJobErrors(data.data);
      }
    } catch {}
    finally {
      setLoadingErrors(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="pb-2 border-b border-slate-200">
          <h1 className="text-xl font-bold text-[#173B65]">Excel Import History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of imported Excel batches, row validation counts, and error summaries.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#173B65] text-white">
                <tr>
                  <th className="py-3 px-4 font-semibold">Import Date</th>
                  <th className="py-3 px-4 font-semibold">File Name</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Total Rows</th>
                  <th className="py-3 px-4 font-semibold text-center">Valid</th>
                  <th className="py-3 px-4 font-semibold text-center">Excluded</th>
                  <th className="py-3 px-4 font-semibold text-center">Duplicates</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Loading import history...
                    </td>
                  </tr>
                ) : jobs.length > 0 ? (
                  jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(j.createdAt).toLocaleString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#173B65]">
                        {j.originalFileName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={j.status === 'COMPLETED' ? 'positive' : 'warning'}>
                          {j.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {j.totalRows}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {j.validRows}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-red-600">
                        {j.invalidRows}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-700">
                        {j.duplicateRows}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {j.reportId && (
                            <Link
                              href={`/reports/${j.reportId}`}
                              className="p-1 text-[#173B65] hover:bg-blue-50 rounded"
                              title="Open Created Report"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                          {j.invalidRows > 0 && (
                            <button
                              onClick={() => openErrorsModal(j.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="View Validation Errors"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No import jobs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Errors Modal */}
        {selectedErrorJobId && (
          <Modal
            isOpen={true}
            onClose={() => setSelectedErrorJobId(null)}
            title="Import Validation Errors Log"
            maxWidth="2xl"
          >
            <div className="space-y-4">
              {loadingErrors ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading error log...</div>
              ) : jobErrors.length > 0 ? (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Column</th>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Message</th>
                        <th className="py-2 px-3">Raw Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobErrors.map((err) => (
                        <tr key={err.id}>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-700">
                            #{err.rowNumber}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{err.columnName || 'N/A'}</td>
                          <td className="py-1.5 px-3 font-semibold text-red-600">{err.errorCode}</td>
                          <td className="py-1.5 px-3 text-slate-700">{err.errorMessage}</td>
                          <td className="py-1.5 px-3 font-mono text-slate-500">
                            {err.originalValue ? `"${err.originalValue}"` : 'empty'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No errors recorded for this import.</div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedErrorJobId(null)}
                  className="px-4 py-1.5 bg-[#173B65] text-white text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
