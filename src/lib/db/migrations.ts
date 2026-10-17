export interface Migration {
  id: string;
  name: string;
  up: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    id: '001_initial_schema',
    name: 'Initial SQLite Schema for RACE SAMPLES',
    up: [
      `CREATE TABLE IF NOT EXISTS "admin_users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        "lastLoginAt" DATETIME
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_key" ON "admin_users"("username");`,

      `CREATE TABLE IF NOT EXISTS "reports" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "reportNumber" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "organizationNameSnapshot" TEXT NOT NULL,
        "logoReferenceSnapshot" TEXT,
        "recipientName" TEXT NOT NULL,
        "sampleReceiptDate" DATETIME NOT NULL,
        "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "originalFileName" TEXT NOT NULL,
        "originalFileReference" TEXT,
        "ageCategory" TEXT DEFAULT 'حقائق',
        "batchIdentifier" TEXT,
        "totalSamples" INTEGER NOT NULL DEFAULT 0,
        "positiveHgbCount" INTEGER NOT NULL DEFAULT 0,
        "positiveHctCount" INTEGER NOT NULL DEFAULT 0,
        "bothPositiveCount" INTEGER NOT NULL DEFAULT 0,
        "hgbThreshold" DECIMAL NOT NULL,
        "hctThreshold" DECIMAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdByAdminId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        "archivedAt" DATETIME,
        CONSTRAINT "reports_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "reports_reportNumber_key" ON "reports"("reportNumber");`,
      `CREATE INDEX IF NOT EXISTS "reports_reportNumber_idx" ON "reports"("reportNumber");`,
      `CREATE INDEX IF NOT EXISTS "reports_generatedAt_idx" ON "reports"("generatedAt");`,
      `CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");`,
      `CREATE INDEX IF NOT EXISTS "reports_createdByAdminId_idx" ON "reports"("createdByAdminId");`,

      `CREATE TABLE IF NOT EXISTS "samples" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "reportId" TEXT NOT NULL,
        "sampleCode" TEXT NOT NULL,
        "rowNumber" INTEGER NOT NULL,
        "hgbValue" DECIMAL NOT NULL,
        "hgbStatus" TEXT NOT NULL,
        "hctValue" DECIMAL NOT NULL,
        "hctStatus" TEXT NOT NULL,
        "bothPositive" BOOLEAN NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "samples_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "samples_reportId_sampleCode_key" ON "samples"("reportId", "sampleCode");`,
      `CREATE INDEX IF NOT EXISTS "samples_reportId_idx" ON "samples"("reportId");`,
      `CREATE INDEX IF NOT EXISTS "samples_sampleCode_idx" ON "samples"("sampleCode");`,
      `CREATE INDEX IF NOT EXISTS "samples_hgbStatus_idx" ON "samples"("hgbStatus");`,
      `CREATE INDEX IF NOT EXISTS "samples_hctStatus_idx" ON "samples"("hctStatus");`,
      `CREATE INDEX IF NOT EXISTS "samples_bothPositive_idx" ON "samples"("bothPositive");`,

      `CREATE TABLE IF NOT EXISTS "import_jobs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "reportId" TEXT,
        "originalFileName" TEXT NOT NULL,
        "fileReference" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "totalRows" INTEGER NOT NULL DEFAULT 0,
        "validRows" INTEGER NOT NULL DEFAULT 0,
        "invalidRows" INTEGER NOT NULL DEFAULT 0,
        "importedRows" INTEGER NOT NULL DEFAULT 0,
        "duplicateRows" INTEGER NOT NULL DEFAULT 0,
        "errorSummary" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" DATETIME
      );`,
      `CREATE INDEX IF NOT EXISTS "import_jobs_status_idx" ON "import_jobs"("status");`,
      `CREATE INDEX IF NOT EXISTS "import_jobs_createdAt_idx" ON "import_jobs"("createdAt");`,

      `CREATE TABLE IF NOT EXISTS "import_errors" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "importJobId" TEXT NOT NULL,
        "worksheetName" TEXT,
        "rowNumber" INTEGER NOT NULL,
        "columnName" TEXT,
        "errorCode" TEXT NOT NULL,
        "errorMessage" TEXT NOT NULL,
        "originalValue" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "import_errors_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "import_jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS "import_errors_importJobId_idx" ON "import_errors"("importJobId");`,

      `CREATE TABLE IF NOT EXISTS "app_settings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "app_settings_key_key" ON "app_settings"("key");`,

      `CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "adminUserId" TEXT,
        "action" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT,
        "details" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS "audit_logs_adminUserId_idx" ON "audit_logs"("adminUserId");`,
      `CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");`,
      `CREATE INDEX IF NOT EXISTS "audit_logs_entityType_idx" ON "audit_logs"("entityType");`,
      `CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");`,
    ],
  },
];
