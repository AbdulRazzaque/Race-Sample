const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function updateInstalledApp() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\itsoftware', 'AppData', 'Local');
  const installDir = path.join(localAppData, 'Programs', 'RACE SAMPLES');

  if (!fs.existsSync(installDir)) {
    console.log(`[AutoUpdate] No installed application found at ${installDir}. Skipping local update.`);
    return;
  }

  const distDir = path.resolve(__dirname, '..', 'dist');
  const setupFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.exe') && f.includes('Setup'));

  if (setupFiles.length === 0) {
    console.warn('[AutoUpdate] No installer .exe found in dist/. Run "npm run electron:dist" first.');
    return;
  }

  const installerPath = path.join(distDir, setupFiles[0]);
  console.log(`[AutoUpdate] Found installer: ${installerPath}`);
  console.log(`[AutoUpdate] Updating local installed application at ${installDir}...`);

  // Kill running instance if open so files are not locked
  try {
    execSync('taskkill /IM "RACE SAMPLES.exe" /F', { stdio: 'ignore' });
    console.log('[AutoUpdate] Closed running instance of RACE SAMPLES.');
  } catch {}

  // Run NSIS silent update (/S)
  const result = spawnSync(installerPath, ['/S'], { stdio: 'inherit' });

  if (result.error) {
    console.error('[AutoUpdate] Silent install error:', result.error);
  } else {
    console.log('[AutoUpdate] Successfully updated installed application!');
  }
}

updateInstalledApp();
