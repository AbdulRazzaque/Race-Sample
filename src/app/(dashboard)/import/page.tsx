'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  RefreshCw,
  Sliders,
  Eye,
  Info,
  Check,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { ImportPreviewResult, ValidatedRow } from '@/types';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stepper state: 1: Upload, 2: Map Columns, 3: Preview Data, 4: Confirm Import
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Preview & Mapping State
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mapping, setMapping] = useState<{
    sampleCode: string;
    hgb: string;
    hct: string;
    sn?: string;
  }>({
    sampleCode: '',
    hgb: '',
    hct: '',
    sn: '',
  });

  // Report metadata form fields
  const [reportTitle, setReportTitle] = useState('تحليل فحص صورة الدم (CBC)');
  const [recipientName, setRecipientName] = useState('الساده/ اللجنة المنظمة لسباق الهجن');
  const [ageCategory, setAgeCategory] = useState('حقائق');
  const [sampleReceiptDate, setSampleReceiptDate] = useState(
    new Date().toISOString().slice(0, 16)
  );

  // Success Completion State
  const [completedReport, setCompletedReport] = useState<{
    reportId: string;
    reportNumber: string;
    importedCount: number;
    rejectedCount: number;
    positiveHgbCount: number;
    positiveHctCount: number;
    bothPositiveCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selected: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(selected.name)) {
      setError('Please select a valid CSV or Excel (.csv, .xlsx, or .xls) file.');
      return;
    }
    setError(null);
    setFile(selected);
    await uploadAndPreview(selected);
  };

  const uploadAndPreview = async (
    targetFile: File,
    sheetOverride?: string,
    mappingOverride?: any
  ) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', targetFile);
    if (sheetOverride) formData.append('sheetName', sheetOverride);
    if (mappingOverride) formData.append('mapping', JSON.stringify(mappingOverride));

    try {
      const res = await fetch('/api/imports/preview', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to preview Excel file');
      }

      const p: ImportPreviewResult = json.data;
      setPreviewData(p);
      setSelectedSheet(p.detectedWorksheet);

      setMapping({
        sampleCode: mappingOverride?.sampleCode || p.detectedColumns.sampleCode || '',
        hgb: mappingOverride?.hgb || p.detectedColumns.hgb || '',
        hct: mappingOverride?.hct || p.detectedColumns.hct || '',
        sn: mappingOverride?.sn || p.detectedColumns.sn || '',
      });
      setCurrentStep(3); // Jump to preview
    } catch (err: any) {
      setError(err.message || 'Error parsing Excel workbook');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (file) {
      uploadAndPreview(file, newSheet, mapping);
    }
  };

  const handleApplyMapping = () => {
    if (file) {
      uploadAndPreview(file, selectedSheet, mapping);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.validRows.length === 0) {
      setError('No valid rows available to import.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        fileName: previewData.fileName,
        validRows: previewData.validRows,
        errors: previewData.errors,
        thresholds: previewData.thresholdsUsed,
        reportTitle,
        recipientName,
        ageCategory,
        sampleReceiptDate,
      };

      const res = await fetch('/api/imports/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete import');
      }

      setCurrentStep(4);
      setCompletedReport(json.summary);
    } catch (err: any) {
      setError(err.message || 'Error committing import records to database');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setError(null);
    setCompletedReport(null);
    setCurrentStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Stepper Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div
              className={`flex items-center gap-3 cursor-pointer ${
                currentStep >= 1 ? 'opacity-100' : 'opacity-50'
              }`}
              onClick={() => {
                if (file) setCurrentStep(1);
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  currentStep === 1
                    ? 'bg-[#1E60AA] text-white shadow-sm ring-4 ring-blue-100'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">Upload File</div>
                <div className="text-[10px] text-slate-400">Select Excel file</div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`flex items-center gap-3 cursor-pointer ${
                currentStep >= 2 ? 'opacity-100' : 'opacity-50'
              }`}
              onClick={() => {
                if (previewData) setCurrentStep(2);
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  currentStep === 2
                    ? 'bg-[#1E60AA] text-white shadow-sm ring-4 ring-blue-100'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">Map Columns</div>
                <div className="text-[10px] text-slate-400">Verify column mapping</div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`flex items-center gap-3 cursor-pointer ${
                currentStep >= 3 ? 'opacity-100' : 'opacity-50'
              }`}
              onClick={() => {
                if (previewData) setCurrentStep(3);
              }}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  currentStep === 3
                    ? 'bg-[#1E60AA] text-white shadow-sm ring-4 ring-blue-100'
                    : currentStep > 3
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > 3 ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">Preview Data</div>
                <div className="text-[10px] text-slate-400">Check calculated results</div>
              </div>
            </div>

            {/* Step 4 */}
            <div
              className={`flex items-center gap-3 ${
                currentStep >= 4 ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  currentStep === 4
                    ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                4
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800">Confirm Import</div>
                <div className="text-[10px] text-slate-400">Save to database</div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* STEP 1: Main Dropzone Card */}
        {(!previewData || currentStep === 1) && (
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-white border-2 border-dashed rounded-2xl p-10 text-center relative shadow-xs transition-all ${
                isDragging
                  ? 'border-[#1E60AA] bg-blue-50/50'
                  : 'border-slate-300 hover:border-[#1E60AA]'
              }`}
            >
              {/* Download Sample Template Button in top-right */}
              <div className="absolute top-5 right-5">
                <a
                  href="/downloads/analyzer_sample_template.csv"
                  download
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#1E60AA]" />
                  <span>Download Sample CSV</span>
                  <span className="text-[10px] text-slate-400">.csv format</span>
                </a>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />

              {/* Excel Green Icon */}
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xs">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <h3 className="text-base font-bold text-[#0F2642]">
                {loading ? 'Analyzing analyzer file...' : 'Drag and drop your analyzer CSV or Excel file here'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Supported formats: .csv, .xlsx, .xls up to 15MB
                <br />
                Automatically detects Sample No., HGB(g/dL), and HCT(%) columns.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="file-upload"
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1E60AA] hover:bg-[#164E8C] cursor-pointer shadow-sm transition-all ${
                    loading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing file...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Browse Computer Files</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Bottom 2-Column Section: Uploaded File Details / Auto Detect & Import Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Uploaded File Details Card */}
                <div className="bg-white p-5 rounded-xl border border-[#D9E0E8] shadow-xs">
                  <h4 className="text-xs font-bold text-[#0F2642] mb-3">
                    Uploaded File Details
                  </h4>

                  {file ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{file.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB • {file.name.endsWith('.csv') ? 'CSV' : file.name.endsWith('.xlsx') ? 'XLSX' : 'XLS'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Ready to process</span>
                        </span>

                        <button
                          onClick={resetAll}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No file uploaded yet. Drop an analyzer CSV or Excel file above to start.
                    </div>
                  )}
                </div>

                {/* Supported Column Names Info Card */}
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 flex items-start gap-3 text-xs">
                  <Info className="w-5 h-5 text-[#1E60AA] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#0F2642]">
                      Required Analyzer Columns (auto-detect)
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 font-mono">
                      1. Sample No. &bull; 2. HGB(g/dL) &bull; 3. HCT(%)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Accepts analyzer files with 250+ columns; only the 3 required columns are read and imported.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Import Rules Card */}
              <div className="bg-white p-5 rounded-xl border border-[#D9E0E8] shadow-xs">
                <h4 className="text-xs font-bold text-[#0F2642] mb-3">
                  Import Rules
                </h4>

                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Supports analyzer .csv, .xlsx, and .xls files</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Auto-detects Sample No., HGB(g/dL), and HCT(%)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Ignores all other non-required analyzer columns</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Accurately preserves decimal values</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Calculates HGB/HCT positivity status automatically</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Validates missing or invalid measurements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Handles and reports duplicate sample numbers</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 & 3: Column Mapping & Data Preview */}
        {previewData && currentStep >= 2 && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white p-4 rounded-xl border border-[#D9E0E8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0F2642]">{previewData.fileName}</div>
                  <div className="text-[11px] text-slate-500">
                    Worksheet: <span className="font-semibold text-slate-800">{selectedSheet}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {previewData.availableWorksheets.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600">Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
                    >
                      {previewData.availableWorksheets.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={resetAll}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Change File
                </button>
              </div>
            </div>

            {/* Column Mapping Section */}
            <div className="bg-white p-5 rounded-xl border border-[#D9E0E8] shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-[#1E60AA]" />
                <h3 className="text-xs font-bold text-[#0F2642] uppercase tracking-wider">
                  Column Mapping Configuration
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sample No. Column <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.sampleCode}
                    onChange={(e) => setMapping({ ...mapping, sampleCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">-- Select Column --</option>
                    {previewData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HGB Column (g/dL) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.hgb}
                    onChange={(e) => setMapping({ ...mapping, hgb: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">-- Select Column --</option>
                    {previewData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HCT Column (%) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.hct}
                    onChange={(e) => setMapping({ ...mapping, hct: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">-- Select Column --</option>
                    {previewData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mapping Validation Warning */}
              {((mapping.sampleCode && mapping.hgb && mapping.sampleCode === mapping.hgb) ||
                (mapping.sampleCode && mapping.hct && mapping.sampleCode === mapping.hct) ||
                (mapping.hgb && mapping.hct && mapping.hgb === mapping.hct)) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>Duplicate column mapping detected! Sample No., HGB(g/dL), and HCT(%) must each map to different columns.</span>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleApplyMapping}
                  disabled={
                    !mapping.sampleCode ||
                    !mapping.hgb ||
                    !mapping.hct ||
                    mapping.sampleCode === mapping.hgb ||
                    mapping.sampleCode === mapping.hct ||
                    mapping.hgb === mapping.hct
                  }
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#1E60AA] hover:bg-[#164E8C] rounded-lg transition-colors disabled:opacity-50"
                >
                  Re-evaluate with Mapping
                </button>
              </div>
            </div>

            {/* Summary KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-[11px] font-semibold text-slate-500">Total Rows</div>
                <div className="text-xl font-bold text-slate-800 mt-1">
                  {previewData.totalParsedRows}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-center bg-emerald-50/20">
                <div className="text-[11px] font-semibold text-emerald-700">Valid Rows</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {previewData.validRowCount}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-red-200 text-center bg-red-50/20">
                <div className="text-[11px] font-semibold text-red-600">Invalid Rows</div>
                <div className="text-xl font-bold text-red-600 mt-1">
                  {previewData.invalidRowCount}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-blue-200 text-center">
                <div className="text-[11px] font-semibold text-blue-700">Pos HGB / HCT</div>
                <div className="text-base font-bold text-[#0F2642] mt-1">
                  {previewData.summary.positiveHgbCount} / {previewData.summary.positiveHctCount}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-red-300 text-center bg-red-50/30">
                <div className="text-[11px] font-bold text-[#E53935]">Both Positive</div>
                <div className="text-xl font-black text-[#E53935] mt-1">
                  {previewData.summary.bothPositiveCount}
                </div>
              </div>
            </div>

            {/* Valid Rows Preview Table */}
            <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0F2642] uppercase tracking-wider">
                    Calculated Status Preview ({previewData.validRows.length} Valid Records)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official server calculation: HGB &ge; {previewData.thresholdsUsed.hgbThreshold} g/dL, HCT &ge; {previewData.thresholdsUsed.hctThreshold}%
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-center text-xs">
                  <thead className="bg-[#0F2642] text-white sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">SN</th>
                      <th className="py-2.5 px-3 font-semibold">SAMPLE NO.</th>
                      <th className="py-2.5 px-3 font-semibold">HGB (g/dL)</th>
                      <th className="py-2.5 px-3 font-semibold">HGB STATUS</th>
                      <th className="py-2.5 px-3 font-semibold">HCT (%)</th>
                      <th className="py-2.5 px-3 font-semibold">HCT STATUS</th>
                      <th className="py-2.5 px-3 font-semibold">BOTH POSITIVE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.validRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-[#0F2642]">
                          {row.sampleCode}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {row.hgbValue}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={row.hgbStatus === 'POSITIVE' ? 'positive' : 'negative'}>
                            {row.hgbStatus}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {row.hctValue}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={row.hctStatus === 'POSITIVE' ? 'positive' : 'negative'}>
                            {row.hctStatus}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {row.bothPositive ? (
                            <Badge variant="bothPositive">YES</Badge>
                          ) : (
                            <span className="text-slate-400 font-medium">NO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Metadata & Confirmation */}
            <div className="bg-white p-6 rounded-xl border border-[#D9E0E8] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#0F2642] uppercase tracking-wider">
                Report Metadata for Persistence
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#1F2937]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#1F2937]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age Category (سن المطايا)</label>
                  <input
                    type="text"
                    value={ageCategory}
                    onChange={(e) => setAgeCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#1F2937]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Date & Time</label>
                  <input
                    type="datetime-local"
                    value={sampleReceiptDate}
                    onChange={(e) => setSampleReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-[#1F2937]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Ready to commit <span className="font-bold text-[#0F2642]">{previewData.validRowCount}</span> samples to MySQL database.
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={resetAll}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmImport}
                    disabled={saving || previewData.validRowCount === 0}
                    className="px-6 py-2.5 bg-[#1E60AA] hover:bg-[#164E8C] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Save Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion Modal */}
        {completedReport && (
          <Modal
            isOpen={true}
            onClose={() => resetAll()}
            title="Import Completed Successfully"
            maxWidth="lg"
          >
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F2642]">
                  Report {completedReport.reportNumber} Created!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Successfully imported {completedReport.importedCount} sample records into the database.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-500 font-medium">Imported Samples</div>
                  <div className="text-xl font-bold text-[#0F2642] mt-1">
                    {completedReport.importedCount}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-medium">Excluded Rows</div>
                  <div className="text-xl font-bold text-red-600 mt-1">
                    {completedReport.rejectedCount}
                  </div>
                </div>
                <div>
                  <div className="text-red-700 font-bold">Both Positive</div>
                  <div className="text-xl font-black text-[#E53935] mt-1">
                    {completedReport.bothPositiveCount}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <Link
                  href={`/reports/${completedReport.reportId}`}
                  className="p-2.5 bg-[#0F2642] hover:bg-[#164E8C] text-white rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Report</span>
                </Link>

                <Link
                  href={`/positive-samples?reportId=${completedReport.reportId}`}
                  className="p-2.5 bg-[#E53935] hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Positive Only</span>
                </Link>

                <a
                  href={`/api/reports/${completedReport.reportId}/export/excel`}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel Export</span>
                </a>

                <a
                  href={`/api/reports/${completedReport.reportId}/export/pdf`}
                  className="p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Export</span>
                </a>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
