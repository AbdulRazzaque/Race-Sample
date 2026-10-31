import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { MIGRATIONS } from './migrations';
import { PrismaClient } from '@prisma/client';

export interface DatabaseInfo {
  databasePath: string;
  sizeBytes: number;
  lastModified: Date | null;
  migrationsApplied: string[];
  totalBackups: number;
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  fileName?: string;
  sizeBytes?: number;
  error?: string;
}

export class SQLiteManager {
  /**
   * Resolves the absolute path to the SQLite database file
   */
  public static resolveDatabasePath(): string {
    const envUrl = process.env.DATABASE_URL || '';
    if (envUrl.startsWith('file:')) {
      const cleanPath = envUrl.replace(/^file:/, '').replace(/^\/\//, '');
      return path.isAbsolute(cleanPath)
        ? path.normalize(cleanPath)
        : path.resolve(process.cwd(), 'prisma', cleanPath);
    }

    if (process.env.APP_USER_DATA_PATH) {
      return path.join(process.env.APP_USER_DATA_PATH, 'race_samples.db');
    }

    // Default development fallback
    return path.resolve(process.cwd(), 'prisma', 'race_samples.db');
  }

  /**
   * Returns the directory where automated and manual backups are stored
   */
  public static getBackupDirectory(dbPath?: string): string {
    const targetDbPath = dbPath || this.resolveDatabasePath();
    const backupDir = path.join(path.dirname(targetDbPath), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  /**
   * Initializes the SQLite database, runs pending versioned migrations,
   * creates an automated backup if migrating an existing database,
   * and seeds default admin credentials if the system is fresh.
   */
  public static async ensureDatabaseInitialized(
    prismaClient: PrismaClient
  ): Promise<{ migrationsRun: number; seeded: boolean }> {
    const dbPath = this.resolveDatabasePath();
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbExistedBefore = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0;

    // 1. Ensure migrations table exists
    await prismaClient.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_app_migrations" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Query applied migrations
    const appliedRows = (await prismaClient.$queryRawUnsafe(
      `SELECT "id" FROM "_app_migrations"`
    )) as Array<{ id: string }>;
    const appliedSet = new Set(appliedRows.map((r) => r.id));

    const pendingMigrations = MIGRATIONS.filter((m) => !appliedSet.has(m.id));
    let migrationsRun = 0;

    if (pendingMigrations.length > 0) {
      // Create automated safety backup before applying migrations on an existing database
      if (dbExistedBefore) {
        console.log(`[SQLiteManager] Creating safety backup before applying ${pendingMigrations.length} migration(s)...`);
        this.createManualBackup(dbPath);
      }

      for (const migration of pendingMigrations) {
        console.log(`[SQLiteManager] Applying migration: ${migration.id} (${migration.name})`);
        for (const statement of migration.up) {
          await prismaClient.$executeRawUnsafe(statement);
        }
        await prismaClient.$executeRawUnsafe(
          `INSERT INTO "_app_migrations" ("id", "name", "appliedAt") VALUES (?, ?, datetime('now'))`,
          migration.id,
          migration.name
        );
        migrationsRun++;
      }
      console.log(`[SQLiteManager] Successfully applied ${migrationsRun} migration(s).`);
    }

    // 3. Ensure initial bootstrap data (Admin user and App Settings)
    let seeded = false;
    const userCountRows = (await prismaClient.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "admin_users"`
    )) as Array<{ count: number | bigint }>;
    const userCount = Number(userCountRows[0]?.count || 0);

    if (userCount === 0) {
      console.log('[SQLiteManager] Fresh database detected. Seeding initial administrator and settings...');
      const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
      const adminPlainPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@RaceSamples2026';
      const passwordHash = await bcrypt.hash(adminPlainPassword, 12);

      await prismaClient.$executeRawUnsafe(
        `INSERT INTO "admin_users" ("id", "username", "passwordHash", "createdAt", "updatedAt") VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        `admin_${Date.now()}`,
        adminUsername,
        passwordHash
      );

      const defaultSettings = [
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

      for (const s of defaultSettings) {
        await prismaClient.$executeRawUnsafe(
          `INSERT OR REPLACE INTO "app_settings" ("id", "key", "value", "updatedAt") VALUES (?, ?, ?, datetime('now'))`,
          `setting_${s.key}`,
          s.key,
          s.value
        );
      }

      seeded = true;
      console.log(`[SQLiteManager] Default administrator account ready: "${adminUsername}"`);
    }

    return { migrationsRun, seeded };
  }

  /**
   * Creates a timestamped safety backup of the database file
   */
  public static createManualBackup(customDbPath?: string): BackupResult {
    const dbPath = customDbPath || this.resolveDatabasePath();
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file does not exist.' };
    }

    try {
      const backupDir = this.getBackupDirectory(dbPath);
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '_')
        .replace(/\..+/, '');
      const fileName = `race_samples_backup_${timestamp}.db`;
      const backupPath = path.join(backupDir, fileName);

      fs.copyFileSync(dbPath, backupPath);
      const sizeBytes = fs.statSync(backupPath).size;

      return {
        success: true,
        backupPath,
        fileName,
        sizeBytes,
      };
    } catch (err: any) {
      console.error('[SQLiteManager] Backup creation failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Lists all existing backups sorted newest first
   */
  public static listBackups(customDbPath?: string): Array<{
    fileName: string;
    filePath: string;
    sizeBytes: number;
    createdAt: Date;
  }> {
    const backupDir = this.getBackupDirectory(customDbPath);
    if (!fs.existsSync(backupDir)) return [];

    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'));
    return files
      .map((f) => {
        const fullPath = path.join(backupDir, f);
        const stats = fs.statSync(fullPath);
        return {
          fileName: f,
          filePath: fullPath,
          sizeBytes: stats.size,
          createdAt: stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Safely restores a backup file over the active database
   */
  public static restoreBackup(
    backupFileName: string,
    customDbPath?: string
  ): { success: boolean; error?: string } {
    const dbPath = customDbPath || this.resolveDatabasePath();
    const backupDir = this.getBackupDirectory(dbPath);
    const backupPath = path.join(backupDir, backupFileName);

    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Specified backup file was not found.' };
    }

    try {
      // First create a temporary pre-restore snapshot of current database
      if (fs.existsSync(dbPath)) {
        const preRestoreSnapshot = path.join(backupDir, `pre_restore_safety_${Date.now()}.db`);
        fs.copyFileSync(dbPath, preRestoreSnapshot);
      }

      fs.copyFileSync(backupPath, dbPath);
      console.log(`[SQLiteManager] Successfully restored backup: ${backupFileName}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieves summary statistics of the database and its environment
   */
  public static async getDatabaseInfo(prismaClient: PrismaClient): Promise<DatabaseInfo> {
    const databasePath = this.resolveDatabasePath();
    let sizeBytes = 0;
    let lastModified: Date | null = null;

    if (fs.existsSync(databasePath)) {
      const stats = fs.statSync(databasePath);
      sizeBytes = stats.size;
      lastModified = stats.mtime;
    }

    let migrationsApplied: string[] = [];
    try {
      const rows = (await prismaClient.$queryRawUnsafe(
        `SELECT "id" FROM "_app_migrations" ORDER BY "appliedAt" ASC`
      )) as Array<{ id: string }>;
      migrationsApplied = rows.map((r) => r.id);
    } catch { }

    const totalBackups = this.listBackups(databasePath).length;

    return {
      databasePath,
      sizeBytes,
      lastModified,
      migrationsApplied,
      totalBackups,
    };
  }
}
