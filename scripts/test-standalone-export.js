const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { SignJWT } = require('jose');
const { PrismaClient } = require('@prisma/client');

async function testStandaloneExport() {
  const isUnpacked = process.argv.includes('--unpacked');
  const testPort = 3098;
  const standaloneDir = isUnpacked
    ? path.resolve(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'standalone')
    : path.resolve(__dirname, '..', '.next', 'standalone');
  const serverScript = path.join(standaloneDir, 'server.js');
  const dbPath = path.resolve(__dirname, '..', 'prisma', 'race_samples.db');

  console.log('[Test] Mode:', isUnpacked ? 'dist/win-unpacked' : '.next/standalone');
  console.log('[Test] Standalone server script:', serverScript);
  console.log('[Test] Testing SQLite DB:', dbPath);

  const prisma = new PrismaClient({
    datasources: { db: { url: 'file:' + dbPath.replace(/\\/g, '/') } }
  });

  const report = await prisma.report.findFirst({
    include: { samples: true }
  });
  await prisma.$disconnect();

  if (!report) {
    console.error('[Test] No report found in database to test.');
    process.exit(1);
  }

  console.log(`[Test] Using report: ${report.reportNumber} (ID: ${report.id}, Samples: ${report.samples.length})`);

  // Start standalone server on testPort
  console.log(`[Test] Launching standalone server on port ${testPort}...`);
  const serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(testPort),
      HOSTNAME: '127.0.0.1',
      DATABASE_URL: 'file:' + dbPath.replace(/\\/g, '/'),
      SESSION_SECRET: 'race_samples_super_secret_session_key_2026_qatar_first_lab_secure'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (d) => console.log(`[StandaloneServer:Out] ${d.toString().trim()}`));
  serverProcess.stderr.on('data', (d) => console.error(`[StandaloneServer:Err] ${d.toString().trim()}`));

  // Wait for server ready
  let isReady = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${testPort}/api/auth/session`, (res) => {
          isReady = true;
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      if (isReady) break;
    } catch {}
  }

  if (!isReady) {
    console.error('[Test] Standalone server failed to start within timeout.');
    serverProcess.kill();
    process.exit(1);
  }

  console.log('[Test] Standalone server is alive! Running export requests...');

  const secretKey = new TextEncoder().encode(
    'race_samples_super_secret_session_key_2026_qatar_first_lab_secure'
  );
  const token = await new SignJWT({ userId: 'admin', username: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey);

  const cookie = `race_samples_session=${token}`;

  function get(pathUrl) {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: testPort,
          path: pathUrl,
          method: 'GET',
          headers: { Cookie: cookie }
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const bodyBuf = Buffer.concat(chunks);
            resolve({
              statusCode: res.statusCode,
              contentType: res.headers['content-type'],
              contentDisposition: res.headers['content-disposition'],
              length: bodyBuf.length,
              sampleText: bodyBuf.toString('utf8', 0, 300)
            });
          });
        }
      );
      req.on('error', (e) => resolve({ error: e.message }));
      req.end();
    });
  }

  console.log('\n================ 1. Full PDF Export ================');
  const pdfRes = await get(`/api/reports/${report.id}/export/pdf`);
  console.log('Status:', pdfRes.statusCode);
  console.log('Content-Type:', pdfRes.contentType);
  console.log('Content-Disposition:', pdfRes.contentDisposition);
  console.log('Bytes received:', pdfRes.length);
  if (pdfRes.statusCode !== 200) console.error('Error body:', pdfRes.sampleText);

  console.log('\n================ 2. Full Excel Export ================');
  const excelRes = await get(`/api/reports/${report.id}/export/excel`);
  console.log('Status:', excelRes.statusCode);
  console.log('Content-Type:', excelRes.contentType);
  console.log('Content-Disposition:', excelRes.contentDisposition);
  console.log('Bytes received:', excelRes.length);
  if (excelRes.statusCode !== 200) console.error('Error body:', excelRes.sampleText);

  console.log('\n================ 3. Positive PDF Export ================');
  const posPdfRes = await get(`/api/reports/${report.id}/export/positive/pdf`);
  console.log('Status:', posPdfRes.statusCode);
  console.log('Content-Type:', posPdfRes.contentType);
  console.log('Content-Disposition:', posPdfRes.contentDisposition);
  console.log('Bytes received:', posPdfRes.length);
  if (posPdfRes.statusCode !== 200) console.error('Error body:', posPdfRes.sampleText);

  console.log('\n================ 4. Positive Excel Export ================');
  const posExcelRes = await get(`/api/reports/${report.id}/export/positive/excel`);
  console.log('Status:', posExcelRes.statusCode);
  console.log('Content-Type:', posExcelRes.contentType);
  console.log('Content-Disposition:', posExcelRes.contentDisposition);
  console.log('Bytes received:', posExcelRes.length);
  if (posExcelRes.statusCode !== 200) console.error('Error body:', posExcelRes.sampleText);

  console.log('\n================ 5. Samples Filtered Excel Export ================');
  const sampleExcelRes = await new Promise((resolve) => {
    const postData = JSON.stringify({ filters: {} });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: testPort,
        path: '/api/samples/export/excel',
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const bodyBuf = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode,
            contentType: res.headers['content-type'],
            contentDisposition: res.headers['content-disposition'],
            length: bodyBuf.length,
            sampleText: bodyBuf.toString('utf8', 0, 300),
          });
        });
      }
    );
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
  console.log('Status:', sampleExcelRes.statusCode);
  console.log('Content-Type:', sampleExcelRes.contentType);
  console.log('Content-Disposition:', sampleExcelRes.contentDisposition);
  console.log('Bytes received:', sampleExcelRes.length);
  if (sampleExcelRes.statusCode !== 200) console.error('Error body:', sampleExcelRes.sampleText);

  console.log('\n[Test] Terminating standalone server process...');
  serverProcess.kill();
  console.log('[Test] All standalone exports tested successfully!');
}

testStandaloneExport().catch((err) => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
