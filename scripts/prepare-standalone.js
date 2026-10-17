const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.error('[prepare-standalone] Error: .next/standalone does not exist. Run "next build" first.');
  process.exit(1);
}

console.log('[prepare-standalone] Preparing Next.js standalone assets for Electron packaging...');

// 1. Copy .next/static -> .next/standalone/.next/static
const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  console.log(`[prepare-standalone] Copying .next/static -> ${staticDest}`);
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
} else {
  console.warn('[prepare-standalone] Warning: .next/static not found.');
}

// 2. Copy public -> .next/standalone/public
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSrc)) {
  console.log(`[prepare-standalone] Copying public -> ${publicDest}`);
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
}

// 3. Copy reference-assets -> .next/standalone/reference-assets
const refAssetsSrc = path.join(rootDir, 'reference-assets');
const refAssetsDest = path.join(standaloneDir, 'reference-assets');
if (fs.existsSync(refAssetsSrc)) {
  console.log(`[prepare-standalone] Copying reference-assets -> ${refAssetsDest}`);
  fs.cpSync(refAssetsSrc, refAssetsDest, { recursive: true, force: true });
}

// 4. Copy prisma schema -> .next/standalone/prisma
const prismaSrc = path.join(rootDir, 'prisma');
const prismaDest = path.join(standaloneDir, 'prisma');
if (fs.existsSync(prismaSrc)) {
  console.log(`[prepare-standalone] Ensuring prisma directory -> ${prismaDest}`);
  if (!fs.existsSync(prismaDest)) {
    fs.mkdirSync(prismaDest, { recursive: true });
  }
  const schemaFile = path.join(prismaSrc, 'schema.prisma');
  if (fs.existsSync(schemaFile)) {
    fs.copyFileSync(schemaFile, path.join(prismaDest, 'schema.prisma'));
  }
}

// 5. Ensure .env exists in standalone
const envSrc = path.join(rootDir, '.env');
const envDest = path.join(standaloneDir, '.env');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
}

console.log('[prepare-standalone] Successfully prepared standalone assets.');
