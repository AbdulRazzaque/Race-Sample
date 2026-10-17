'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Sliders,
  ShieldCheck,
  Save,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // General Settings
  const [appName, setAppName] = useState('RACE SAMPLES');
  const [orgName, setOrgName] = useState('FIRST LAB');
  const [orgNameAr, setOrgNameAr] = useState('المختبر الأول');
  const [eventName, setEventName] = useState('الدورة لسباقات الهجن');
  const [recipientName, setRecipientName] = useState('السادة / اللجنة المنظمة لسباق الهجن');
  const [ageCategory, setAgeCategory] = useState('حقائق');
  const [reportHeaderNotes, setReportHeaderNotes] = useState('');
  const [footerText, setFooterText] = useState('');

  // Threshold Settings
  const [hgbThreshold, setHgbThreshold] = useState<number>(14.0);
  const [hctThreshold, setHctThreshold] = useState<number>(32.0);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSecuritySection, setShowSecuritySection] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.data;
        if (s.appName) setAppName(s.appName);
        if (s.orgName) setOrgName(s.orgName);
        if (s.orgNameAr) setOrgNameAr(s.orgNameAr);
        if (s.eventName) setEventName(s.eventName);
        if (s.recipientName) setRecipientName(s.recipientName);
        if (s.ageCategory) setAgeCategory(s.ageCategory);
        if (s.reportHeaderNotes) setReportHeaderNotes(s.reportHeaderNotes);
        if (s.footerText) setFooterText(s.footerText);
        if (s.hgbThreshold !== undefined) setHgbThreshold(s.hgbThreshold);
        if (s.hctThreshold !== undefined) setHctThreshold(s.hctThreshold);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setNotification(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName,
          orgName,
          orgNameAr,
          eventName,
          recipientName,
          ageCategory,
          reportHeaderNotes,
          footerText,
        }),
      });

      if (!res.ok) throw new Error('Failed to save general settings');
      setNotification({ type: 'success', message: 'General settings saved successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error saving settings' });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThresholds(true);
    setNotification(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hgbThreshold,
          hctThreshold,
        }),
      });

      if (!res.ok) throw new Error('Failed to save threshold settings');
      setNotification({
        type: 'success',
        message: 'Positivity thresholds updated successfully.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating thresholds' });
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (newPassword !== confirmPassword) {
      setNotification({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setNotification({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password');
      }

      setNotification({ type: 'success', message: 'Administrator password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error updating password' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0F2642]" />
          <p className="text-xs text-slate-500 font-semibold">Loading system settings...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {notification && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-xs ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">{notification.message}</div>
          </div>
        )}

        {/* 2-COLUMN GRID MATCHING SCREEN 6 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* CARD 1: OFFICIAL POSITIVITY THRESHOLDS */}
          <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between bg-red-50/30">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-[#E53935] flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#E53935] uppercase tracking-wider">
                    OFFICIAL POSITIVITY THRESHOLDS
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Defines default HGB and HCT cut-off values for CBC evaluations.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-100 text-[#E53935] border border-red-200/60">
                MANDATORY RULE
              </span>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveThresholds} className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* HGB Threshold */}
                <div>
                  <label className="block text-xs font-bold text-[#0F2642] mb-1">
                    Hemoglobin (HGB) Threshold (g/dL)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                    Sample is POSITIVE when HGB &ge; threshold (Default: 14.0)
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="40"
                    required
                    value={hgbThreshold}
                    onChange={(e) => setHgbThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-[#0F2642] focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 shadow-2xs"
                  />
                </div>

                {/* HCT Threshold */}
                <div>
                  <label className="block text-xs font-bold text-[#0F2642] mb-1">
                    Hematocrit (HCT) Threshold (%)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                    Sample is POSITIVE when HCT &ge; threshold (Default: 32.0)
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    required
                    value={hctThreshold}
                    onChange={(e) => setHctThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-[#0F2642] focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingThresholds}
                  className="px-5 py-2.5 bg-[#E53935] hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-98"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingThresholds ? 'Saving...' : 'Save Threshold Rules'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* CARD 2: LABORATORY & REPORT BRANDING */}
          <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1E60AA] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#0F2642] uppercase tracking-wider">
                    Laboratory &amp; Report Branding
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Define official labels and ownership information
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveGeneral} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Org English */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organization Name (English)
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E60AA] shadow-2xs"
                  />
                </div>

                {/* Org Arabic */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organization Name (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={orgNameAr}
                    onChange={(e) => setOrgNameAr(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E60AA] shadow-2xs"
                  />
                </div>

                {/* Event Name Arabic */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event / Festival Name (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E60AA] shadow-2xs"
                  />
                </div>

                {/* Recipient Arabic */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient Name (Arabic)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E60AA] shadow-2xs"
                  />
                </div>

                {/* App Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Application Title
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E60AA] shadow-2xs"
                  />
                </div>

                {/* Age Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Default Age Category (سن المطايا)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={ageCategory}
                    onChange={(e) => setAgeCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E60AA] shadow-2xs"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingGeneral}
                  className="px-5 py-2.5 bg-[#1E60AA] hover:bg-[#164E8C] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-98"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingGeneral ? 'Saving...' : 'Save General Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Collapsible Security Settings */}
        <div className="bg-white rounded-xl border border-[#D9E0E8] shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSecuritySection(!showSecuritySection)}
            className="w-full px-5 py-3.5 bg-slate-50/60 hover:bg-slate-100/60 border-b border-slate-200 flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#0F2642]" />
              <div>
                <h3 className="text-xs font-bold text-[#0F2642] uppercase tracking-wider">
                  Administrator Password &amp; Security
                </h3>
                <p className="text-[11px] text-slate-400">
                  Update master administrator credentials
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#1E60AA]">
              {showSecuritySection ? 'Hide' : 'Configure'}
            </span>
          </button>

          {showSecuritySection && (
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-[#0F2642] hover:bg-[#1E60AA] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{savingPassword ? 'Updating...' : 'Change Admin Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}

