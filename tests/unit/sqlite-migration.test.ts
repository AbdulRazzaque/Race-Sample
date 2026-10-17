import { SQLiteManager } from '../../src/lib/db/sqlite-manager';
import fs from 'fs';
import path from 'path';

describe('SQLiteManager Migrations & Data Safety', () => {
  const testDbDir = path.resolve(process.cwd(), 'prisma', 'test_scratch');
  const testDbPath = path.join(testDbDir, 'test_migration.db');

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    }
  });

  test('creates automated backups safely', () => {
    // Create a dummy db file
    fs.writeFileSync(testDbPath, 'dummy-sqlite-content');
    const result = SQLiteManager.createManualBackup(testDbPath);

    expect(result.success).toBe(true);
    expect(result.backupPath).toBeDefined();
    expect(fs.existsSync(result.backupPath!)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
  });

  test('lists existing backups correctly', () => {
    const backups = SQLiteManager.listBackups(testDbPath);
    expect(Array.isArray(backups)).toBe(true);
    expect(backups.length).toBeGreaterThan(0);
    expect(backups[0].fileName).toMatch(/^race_samples_backup_.*\.db$/);
  });

  test('restores database from backup safely', () => {
    const backups = SQLiteManager.listBackups(testDbPath);
    const newestBackup = backups[0];

    // Modify active file
    fs.writeFileSync(testDbPath, 'modified-content');
    expect(fs.readFileSync(testDbPath, 'utf8')).toBe('modified-content');

    // Restore
    const restoreResult = SQLiteManager.restoreBackup(newestBackup.fileName, testDbPath);
    expect(restoreResult.success).toBe(true);
    expect(fs.readFileSync(testDbPath, 'utf8')).toBe('dummy-sqlite-content');
  });
});
