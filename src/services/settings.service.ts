import prisma from '@/lib/db/prisma';
import { DEFAULT_APP_SETTINGS } from '@/constants';

export interface AppSettingsData {
  appName: string;
  orgName: string;
  orgNameAr: string;
  eventName: string;
  recipientName: string;
  ageCategory: string;
  hgbThreshold: number;
  hctThreshold: number;
  reportHeaderNotes: string;
  footerText: string;
  logoDataUrl?: string;
  committeeLogoDataUrl?: string;
  stampDataUrl?: string;
}

export class SettingsService {
  public static async getAllSettings(): Promise<AppSettingsData> {
    const records = await prisma.appSetting.findMany();
    const map = new Map<string, string>();
    records.forEach((r) => map.set(r.key, r.value));

    return {
      appName: map.get('appName') || DEFAULT_APP_SETTINGS.appName,
      orgName: map.get('orgName') || DEFAULT_APP_SETTINGS.orgName,
      orgNameAr: map.get('orgNameAr') || DEFAULT_APP_SETTINGS.orgNameAr,
      eventName: map.get('eventName') || DEFAULT_APP_SETTINGS.eventName,
      recipientName: map.get('recipientName') || DEFAULT_APP_SETTINGS.recipientName,
      ageCategory: map.get('ageCategory') || DEFAULT_APP_SETTINGS.ageCategory,
      hgbThreshold: parseFloat(map.get('hgbThreshold') || String(DEFAULT_APP_SETTINGS.hgbThreshold)),
      hctThreshold: parseFloat(map.get('hctThreshold') || String(DEFAULT_APP_SETTINGS.hctThreshold)),
      reportHeaderNotes: map.get('reportHeaderNotes') || DEFAULT_APP_SETTINGS.reportHeaderNotes,
      footerText: map.get('footerText') || DEFAULT_APP_SETTINGS.footerText,
      logoDataUrl: map.get('logoDataUrl') || undefined,
      committeeLogoDataUrl: map.get('committeeLogoDataUrl') || undefined,
      stampDataUrl: map.get('stampDataUrl') || undefined,
    };
  }

  public static async getThresholds(): Promise<{ hgbThreshold: number; hctThreshold: number }> {
    const settings = await this.getAllSettings();
    return {
      hgbThreshold: settings.hgbThreshold,
      hctThreshold: settings.hctThreshold,
    };
  }

  public static async updateSettings(
    newSettings: Partial<AppSettingsData>,
    adminUserId?: string
  ): Promise<AppSettingsData> {
    const previous = await this.getAllSettings();
    const entries = Object.entries(newSettings);

    const changedThresholds: Record<string, { from: number; to: number }> = {};

    for (const [key, value] of entries) {
      if (value !== undefined) {
        if (key === 'hgbThreshold' || key === 'hctThreshold') {
          const prevVal = key === 'hgbThreshold' ? previous.hgbThreshold : previous.hctThreshold;
          const newVal = Number(value);
          if (prevVal !== newVal) {
            changedThresholds[key] = { from: prevVal, to: newVal };
          }
        }

        await prisma.appSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    // If thresholds changed, create an explicit audit log entry
    if (Object.keys(changedThresholds).length > 0) {
      await prisma.auditLog.create({
        data: {
          adminUserId: adminUserId || null,
          action: 'THRESHOLD_SETTINGS_UPDATED',
          entityType: 'AppSetting',
          entityId: 'thresholds',
          details: JSON.stringify({
            changes: changedThresholds,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          adminUserId: adminUserId || null,
          action: 'GENERAL_SETTINGS_UPDATED',
          entityType: 'AppSetting',
          entityId: 'general',
          details: JSON.stringify({
            keysUpdated: Object.keys(newSettings),
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    return this.getAllSettings();
  }
}
