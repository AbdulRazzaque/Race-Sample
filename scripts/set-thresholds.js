const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

async function updateDb(dbPath) {
  if (!fs.existsSync(dbPath)) return;
  console.log('[ThresholdSync] Updating database:', dbPath);
  const prisma = new PrismaClient({
    datasources: { db: { url: 'file:' + dbPath.replace(/\\/g, '/') } }
  });

  await prisma.appSetting.upsert({
    where: { key: 'hgbThreshold' },
    update: { value: '14.0' },
    create: { id: 'setting_hgbThreshold', key: 'hgbThreshold', value: '14.0' }
  });

  await prisma.appSetting.upsert({
    where: { key: 'hctThreshold' },
    update: { value: '32.0' },
    create: { id: 'setting_hctThreshold', key: 'hctThreshold', value: '32.0' }
  });

  await prisma.appSetting.upsert({
    where: { key: 'reportHeaderNotes' },
    update: {
      value: 'تعتبر العينات إيجابية وفقا لاشتراطات اللجنة المنظمة لسباقات الهجن إذا تجاوزت أو بلغت القيم المحددة للهيموجلوبين (HGB) والهيماتوكريت (HCT) معاً، وذلك وفقًا للحدود (HGB ≥ 14, HCT ≥ 32)'
    },
    create: {
      id: 'setting_reportHeaderNotes',
      key: 'reportHeaderNotes',
      value: 'تعتبر العينات إيجابية وفقا لاشتراطات اللجنة المنظمة لسباقات الهجن إذا تجاوزت أو بلغت القيم المحددة للهيموجلوبين (HGB) والهيماتوكريت (HCT) معاً، وذلك وفقًا للحدود (HGB ≥ 14, HCT ≥ 32)'
    }
  });

  const verified = await prisma.appSetting.findMany({
    where: { key: { in: ['hgbThreshold', 'hctThreshold', 'reportHeaderNotes'] } }
  });

  console.log('[ThresholdSync] Verified settings in', dbPath);
  verified.forEach(s => console.log(`  ${s.key}: ${s.value}`));

  await prisma.$disconnect();
}

async function main() {
  const localAppData = process.env.APPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\itsoftware', 'AppData', 'Roaming');
  const userDb = path.join(localAppData, 'race-samples', 'race_samples.db');
  const projectDb = path.resolve(__dirname, '..', 'prisma', 'race_samples.db');

  await updateDb(userDb);
  await updateDb(projectDb);
  console.log('[ThresholdSync] Done!');
}

main().catch(err => {
  console.error('[ThresholdSync Error]:', err);
  process.exit(1);
});
