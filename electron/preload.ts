import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getDatabaseInfo: () => Promise<any>;
  createDatabaseBackup: () => Promise<any>;
  listDatabaseBackups: () => Promise<any>;
  openUserDataFolder: () => Promise<void>;
  checkForUpdates: () => Promise<any>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateProgress: (callback: (progress: any) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
  platform: string;
}

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getDatabaseInfo: () => ipcRenderer.invoke('db:get-info'),
  createDatabaseBackup: () => ipcRenderer.invoke('db:create-backup'),
  listDatabaseBackups: () => ipcRenderer.invoke('db:list-backups'),
  openUserDataFolder: () => ipcRenderer.invoke('app:open-user-data'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  onUpdateAvailable: (callback) => {
    const handler = (_event: any, info: any) => callback(info);
    ipcRenderer.on('update:available', handler);
    return () => ipcRenderer.removeListener('update:available', handler);
  },

  onUpdateProgress: (callback) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('update:progress', handler);
    return () => ipcRenderer.removeListener('update:progress', handler);
  },

  onUpdateDownloaded: (callback) => {
    const handler = (_event: any, info: any) => callback(info);
    ipcRenderer.on('update:downloaded', handler);
    return () => ipcRenderer.removeListener('update:downloaded', handler);
  },

  platform: process.platform,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
