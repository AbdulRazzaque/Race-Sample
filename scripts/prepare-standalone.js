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

// 6. Ensure complete node_modules for export dependencies (pdfkit, exceljs, arabic reshaper, bidi)
// Next.js NFT traces can omit vital conditional export files (.mjs) like generator-function/require.mjs
// and async-function/require.mjs, causing 500 runtime errors in packaged production.
const rootNodeModules = path.join(rootDir, 'node_modules');
const standaloneNodeModules = path.join(standaloneDir, 'node_modules');

if (fs.existsSync(rootNodeModules) && fs.existsSync(standaloneNodeModules)) {
  console.log('[prepare-standalone] Synchronizing export dependencies into standalone node_modules...');

  function getRecursiveDependencies(pkgName, seen = new Set()) {
    if (seen.has(pkgName)) return seen;
    seen.add(pkgName);
    const pkgJsonPath = path.join(rootNodeModules, pkgName, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) return seen;
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const deps = Object.keys(pkgJson.dependencies || {});
      for (const d of deps) {
        getRecursiveDependencies(d, seen);
      }
    } catch {}
    return seen;
  }

  const exportCorePackages = [
    'papaparse',
    'pdfkit',
    'exceljs',
    'arabic-persian-reshaper',
    'bidi-js',
    'generator-function',
    'async-function',
    'es-abstract',
    'es-get-iterator',
    'uuid',
  ];

  const allExportDeps = new Set();
  for (const pkg of exportCorePackages) {
    getRecursiveDependencies(pkg, allExportDeps);
  }

  let copiedCount = 0;
  for (const pkg of allExportDeps) {
    const srcPkgDir = path.join(rootNodeModules, pkg);
    const destPkgDir = path.join(standaloneNodeModules, pkg);
    if (fs.existsSync(srcPkgDir)) {
      const parentDir = path.dirname(destPkgDir);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.cpSync(srcPkgDir, destPkgDir, { recursive: true, force: true });
      copiedCount++;
    }
  }

  console.log(`[prepare-standalone] Successfully copied ${copiedCount} export dependency packages to standalone node_modules.`);

  // Also sync to unpacked dist if it exists
  const distStandaloneNM = path.join(rootDir, 'dist', 'win-unpacked', 'resources', 'standalone', 'node_modules');
  if (fs.existsSync(distStandaloneNM)) {
    console.log('[prepare-standalone] Synchronizing export dependencies to dist/win-unpacked/resources/standalone/node_modules...');
    for (const pkg of allExportDeps) {
      const srcPkgDir = path.join(rootNodeModules, pkg);
      const destPkgDir = path.join(distStandaloneNM, pkg);
      if (fs.existsSync(srcPkgDir)) {
        const parentDir = path.dirname(destPkgDir);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.cpSync(srcPkgDir, destPkgDir, { recursive: true, force: true });
      }
    }
    console.log('[prepare-standalone] Successfully synchronized unpacked dist node_modules.');
  }
}

console.log('[prepare-standalone] Successfully prepared standalone assets.');
