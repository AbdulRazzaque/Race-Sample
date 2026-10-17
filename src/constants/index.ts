export const DEFAULT_HGB_THRESHOLD = 14.0;
export const DEFAULT_HCT_THRESHOLD = 32.0;

export const DEFAULT_APP_SETTINGS = {
  appName: 'RACE SAMPLES',
  orgName: 'FIRST LAB',
  orgNameAr: 'المختبر الأول',
  eventName: 'المهرجان الصيفي',
  recipientName: 'الساده/ اللجنة المنظمة لسباق الهجن',
  ageCategory: 'حقائق',
  hgbThreshold: 14.0,
  hctThreshold: 32.0,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'hh:mm A',
  reportHeaderNotes: 'تعتبر العينات إيجابية وفقا لاشتراطات اللجنة المنظمة لسباقات الهجن إذا تجاوزت أو بلغت القيم المحددة للهيموجلوبين (HGB) والهيماتوكريت (HCT) معاً، وذلك وفقًا للحدود (HGB ≥ 14, HCT ≥ 32)',
  footerText: 'FIRST LAB — Camel CBC Analysis Validation System',
  maxUploadSizeBytes: 15 * 1024 * 1024, // 15MB
  maxImportRows: 10000,
};

export const STORAGE_KEYS = {
  SESSION_COOKIE: 'race_samples_session',
};
