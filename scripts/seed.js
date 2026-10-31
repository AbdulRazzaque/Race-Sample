const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding RACE SAMPLES database...');

  // 1. Create Default Admin User
  const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
  const adminPlainPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@RaceSamples2026';
  const passwordHash = await bcrypt.hash(adminPlainPassword, 12);

  const admin = await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: {
      username: adminUsername,
      passwordHash,
    },
  });

  console.log(`Administrator account ready: ${admin.username}`);

  // 2. Default App Settings
  const settings = [
    { key: 'appName', value: 'RACE SAMPLES' },
    { key: 'orgName', value: 'FIRST LAB' },
    { key: 'orgNameAr', value: 'المختبر الأول' },
    { key: 'eventName', value: 'المهرجان الصيفي' },
    { key: 'recipientName', value: 'الساده/ اللجنة المنظمة لسباق الهجن' },
    { key: 'ageCategory', value: 'حقائق' },
    { key: 'hgbThreshold', value: '14.0' },
    { key: 'hctThreshold', value: '32.0' },
    {
      key: 'reportHeaderNotes',
      value:
        'تُعتبر العينات إيجابية وفقًا لاشتراطات اللجنة المنظمة لسباقات الهجن إذا تجاوزت أو بلغت القيم المحددة للهيموجلوبين (HGB) والهيماتوكريت (HCT) معا، وذلك وفقًا للحدود (HGB ≥ 14, HCT ≥ 32)',
    },
    { key: 'footerText', value: 'FIRST LAB — Camel CBC Analysis Validation System' },
  ];

  for (const s of settings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  // 3. Seed Reference Report RC-0001 from Reference Images
  const existingReport = await prisma.report.findUnique({
    where: { reportNumber: 'RC-0001' },
  });

  if (!existingReport) {
    console.log('Creating initial reference report RC-0001 matching reference images...');

    const reportSamples = [
      { code: 'FL-25-0001', hgb: 14.8, hct: 32.8 },
      { code: 'FL-25-0002', hgb: 13.3, hct: 29.0 },
      { code: 'FL-25-0003', hgb: 12.8, hct: 27.9 },
      { code: 'FL-25-0004', hgb: 12.6, hct: 27.9 },
      { code: 'FL-25-0005', hgb: 12.1, hct: 27.4 },
      { code: 'FL-25-0006', hgb: 13.2, hct: 29.5 },
      { code: 'FL-25-0007', hgb: 13.4, hct: 30.1 },
      { code: 'FL-25-0008', hgb: 14.7, hct: 33.0 },
      { code: 'FL-25-0009', hgb: 12.6, hct: 28.8 },
      { code: 'FL-25-0010', hgb: 14.0, hct: 32.6 },
      { code: 'FL-25-0011', hgb: 15.3, hct: 34.4 },
      { code: 'FL-25-0012', hgb: 14.3, hct: 32.3 },
      { code: 'FL-25-0013', hgb: 12.8, hct: 28.9 },
      { code: 'FL-25-0014', hgb: 15.4, hct: 35.6 },
      { code: 'FL-25-0015', hgb: 14.3, hct: 33.2 },
      { code: 'FL-25-0016', hgb: 14.4, hct: 31.9 }, // HGB pos, HCT neg -> Both NO
      { code: 'FL-25-0017', hgb: 13.2, hct: 29.9 },
      { code: 'FL-25-0018', hgb: 12.6, hct: 28.5 },
      { code: 'FL-25-0019', hgb: 14.6, hct: 33.1 },
      { code: 'FL-25-0020', hgb: 12.6, hct: 28.5 },
      { code: 'FL-25-0021', hgb: 11.6, hct: 25.5 },
      { code: 'FL-25-0022', hgb: 13.4, hct: 30.5 },
      { code: 'FL-25-0023', hgb: 12.7, hct: 28.0 },
      { code: 'FL-25-0024', hgb: 13.3, hct: 30.2 },
      { code: 'FL-25-0025', hgb: 12.0, hct: 26.8 },
      { code: 'FL-25-0026', hgb: 12.8, hct: 28.6 },
      // Additional samples matching the 22 positive list in Reference Image 2
      { code: 'FL-25-0028', hgb: 14.6, hct: 32.5 },
      { code: 'FL-25-0029', hgb: 16.4, hct: 36.9 },
      { code: 'FL-25-0030', hgb: 12.5, hct: 28.0 },
      { code: 'FL-25-0039', hgb: 14.6, hct: 33.3 },
      { code: 'FL-25-0040', hgb: 14.1, hct: 32.7 },
      { code: 'FL-25-0041', hgb: 14.9, hct: 34.2 },
      { code: 'FL-25-0047', hgb: 15.2, hct: 34.5 },
      { code: 'FL-25-0049', hgb: 14.7, hct: 32.6 },
      { code: 'FL-25-0054', hgb: 14.6, hct: 32.4 },
      { code: 'FL-25-0058', hgb: 14.3, hct: 32.8 },
      { code: 'FL-25-0065', hgb: 14.2, hct: 33.2 },
      { code: 'FL-25-0066', hgb: 14.0, hct: 32.5 },
      { code: 'FL-25-0072', hgb: 14.6, hct: 34.3 },
      { code: 'FL-25-0079', hgb: 14.8, hct: 34.0 },
      { code: 'FL-25-0085', hgb: 14.4, hct: 32.4 },
    ];

    const HGB_TH = 14.0;
    const HCT_TH = 32.0;

    let posHgb = 0;
    let posHct = 0;
    let bothPos = 0;

    const evaluated = reportSamples.map((s, idx) => {
      const hgbStatus = s.hgb >= HGB_TH ? 'POSITIVE' : 'NEGATIVE';
      const hctStatus = s.hct >= HCT_TH ? 'POSITIVE' : 'NEGATIVE';
      const both = hgbStatus === 'POSITIVE' && hctStatus === 'POSITIVE';

      if (hgbStatus === 'POSITIVE') posHgb++;
      if (hctStatus === 'POSITIVE') posHct++;
      if (both) bothPos++;

      return {
        sampleCode: s.code,
        rowNumber: idx + 1,
        hgbValue: new Prisma.Decimal(s.hgb),
        hgbStatus,
        hctValue: new Prisma.Decimal(s.hct),
        hctStatus,
        bothPositive: both,
      };
    });

    const report = await prisma.report.create({
      data: {
        reportNumber: 'RC-0001',
        title: 'تحليل فحص صورة الدم (CBC)',
        organizationNameSnapshot: 'FIRST LAB',
        recipientName: 'الساده/ اللجنة المنظمة لسباق الهجن',
        sampleReceiptDate: new Date('2026-10-17T07:00:00Z'),
        generatedAt: new Date('2026-10-13T14:33:00Z'),
        originalFileName: 'CBC_RACE_SAMPLES_FL-25.xlsx',
        ageCategory: 'حقائق',
        batchIdentifier: 'FL-25-0001-0085',
        totalSamples: evaluated.length,
        positiveHgbCount: posHgb,
        positiveHctCount: posHct,
        bothPositiveCount: bothPos,
        hgbThreshold: new Prisma.Decimal(HGB_TH),
        hctThreshold: new Prisma.Decimal(HCT_TH),
        status: 'ACTIVE',
        createdByAdminId: admin.id,
        samples: {
          create: evaluated,
        },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'REPORT_INITIALIZED',
        entityType: 'Report',
        entityId: report.id,
        details: JSON.stringify({
          reportNumber: report.reportNumber,
          totalSamples: evaluated.length,
          bothPositiveCount: bothPos,
        }),
      },
    });

    console.log(`Created reference report ${report.reportNumber} with ${evaluated.length} samples.`);
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
