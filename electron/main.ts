import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';
import { ServerManager } from './server-manager';

// Ensure single instance lock so multiple copies of the desktop app cannot run concurrently
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.warn('[ElectronMain] Another instance is already running. Quitting duplicate instance.');
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let serverInfo: { url: string; port: number } | null = null;

// Configure autoUpdater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

/**
 * Creates the primary application window
 */
function createMainWindow(targetUrl: string): BrowserWindow {
  const isDev = !app.isPackaged;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'RACE SAMPLES — Laboratory CBC Sample Management System',
    show: false, // Show once ready-to-show to prevent blank screen flicker
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Remove default menu bar for a clean desktop feel
  win.removeMenu();

  win.loadURL(targetUrl);

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (isDev) {
      console.log('[ElectronMain] Main window presented in development mode.');
    }
  });

  // Handle external link clicks securely - open in user's default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      // Check if external or local
      if (!url.includes(`127.0.0.1:${serverInfo?.port || 3000}`) && !url.includes(`localhost:${serverInfo?.port || 3000}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

/**
 * Registers all IPC handlers exposed via preload contextBridge
 */
function setupIpcHandlers(): void {
  const userDataDir = app.getPath('userData');
  const dbPath = path.join(userDataDir, 'race_samples.db');
  const backupsDir = path.join(userDataDir, 'backups');

  // Application version
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  // Open persistent user data directory in Windows File Explorer
  ipcMain.handle('app:open-user-data', async () => {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    await shell.openPath(userDataDir);
  });

  // Database metadata and statistics
  ipcMain.handle('db:get-info', async () => {
    const exists = fs.existsSync(dbPath);
    let sizeBytes = 0;
    let lastModified: Date | null = null;

    if (exists) {
      try {
        const stats = fs.statSync(dbPath);
        sizeBytes = stats.size;
        lastModified = stats.mtime;
      } catch {}
    }

    let totalBackups = 0;
    if (fs.existsSync(backupsDir)) {
      try {
        totalBackups = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.db')).length;
      } catch {}
    }

    return {
      databasePath: dbPath,
      exists,
      sizeBytes,
      lastModified,
      userDataPath: userDataDir,
      backupsDirectory: backupsDir,
      totalBackups,
    };
  });

  // Manual database backup
  ipcMain.handle('db:create-backup', async () => {
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Active database file does not exist yet.' };
    }

    try {
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '_')
        .replace(/\..+/, '');
      const fileName = `race_samples_backup_${timestamp}.db`;
      const backupPath = path.join(backupsDir, fileName);

      fs.copyFileSync(dbPath, backupPath);
      const stats = fs.statSync(backupPath);

      return {
        success: true,
        fileName,
        backupPath,
        sizeBytes: stats.size,
      };
    } catch (err: any) {
      console.error('[ElectronMain] Backup error:', err);
      return { success: false, error: err.message };
    }
  });

  // List all available backups
  ipcMain.handle('db:list-backups', async () => {
    if (!fs.existsSync(backupsDir)) return [];

    try {
      const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith('.db'));
      return files
        .map((f) => {
          const fullPath = path.join(backupsDir, f);
          const stats = fs.statSync(fullPath);
          return {
            fileName: f,
            filePath: fullPath,
            sizeBytes: stats.size,
            createdAt: stats.mtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      console.error('[ElectronMain] Error reading backups:', err);
      return [];
    }
  });

  // Software update management
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      return {
        status: 'development',
        message: 'Automatic updates are active in packaged production builds only.',
      };
    }

    const updateConfig = path.join(process.resourcesPath, 'app-update.yml');
    if (!fs.existsSync(updateConfig)) {
      return {
        status: 'unconfigured',
        message: 'Update configuration not deployed in this build. Publish a release to enable auto-updates.',
      };
    }

    try {
      const updateCheckResult = await autoUpdater.checkForUpdates();
      return {
        status: 'checking',
        updateInfo: updateCheckResult?.updateInfo,
      };
    } catch (err: any) {
      console.error('[ElectronMain] Update check error:', err);
      return {
        status: 'error',
        error: err.message || 'Failed to check for updates',
      };
    }
  });

  ipcMain.handle('update:install', async () => {
    if (!app.isPackaged) {
      console.log('[ElectronMain] Quit and install invoked in dev mode (ignored).');
      return;
    }
    autoUpdater.quitAndInstall();
  });
}

/**
 * Configure autoUpdater event listeners for forwarding status to renderer
 */
function setupAutoUpdaterEvents(): void {
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] New update available:', info.version);
    mainWindow?.webContents.send('update:available', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[AutoUpdater] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
    mainWindow?.webContents.send('update:progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded successfully:', info.version);
    mainWindow?.webContents.send('update:downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error occurred:', err);
  });
}

// Handle second instance attempt: focus existing window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// App lifecycle initialization
app.whenReady().then(async () => {
  console.log('[ElectronMain] Electron is ready. Initializing desktop application...');

  setupIpcHandlers();
  setupAutoUpdaterEvents();

  try {
    // Start local Next.js standalone server
    serverInfo = await ServerManager.startServer();
    console.log(`[ElectronMain] Starting UI window pointing to ${serverInfo.url}`);
    mainWindow = createMainWindow(serverInfo.url);

    // In packaged production, automatically check for updates after 5 seconds if update config is present
    if (app.isPackaged) {
      setTimeout(() => {
        const updateConfig = path.join(process.resourcesPath, 'app-update.yml');
        if (fs.existsSync(updateConfig)) {
          autoUpdater.checkForUpdatesAndNotify().catch((err) => {
            console.warn('[AutoUpdater] Initial update check silently failed:', err.message);
          });
        } else {
          console.log('[AutoUpdater] No app-update.yml detected in resources. Auto-update check skipped.');
        }
      }, 5000);
    }
  } catch (err: any) {
    console.error('[ElectronMain] Fatal initialization error:', err);
    // Display error dialog if server failed to start
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Application Initialization Error',
      `Failed to launch the embedded application engine:\n\n${err?.message || err}\n\nPlease contact support.`
    );
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverInfo) {
    mainWindow = createMainWindow(serverInfo.url);
  }
});

// Clean termination: gracefully shut down the Next.js server before quitting
app.on('before-quit', () => {
  console.log('[ElectronMain] App is quitting. Cleaning up background services...');
  ServerManager.stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
