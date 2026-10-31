import { ServerManager } from '../../electron/server-manager';
import http from 'http';

describe('ServerManager Port & Identity Verification', () => {
  let mockForeignServer: http.Server | null = null;
  const mockPort = 31985;

  beforeAll((done) => {
    // Spin up a mock foreign server that mimics a third-party React SPA
    // serving text/html or generic 404/200 responses
    mockForeignServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><html><body><h1>Pharmacy Management System</h1></body></html>');
    });
    mockForeignServer.listen(mockPort, '0.0.0.0', done);
  });

  afterAll((done) => {
    if (mockForeignServer) {
      mockForeignServer.close(done);
    } else {
      done();
    }
  });

  test('isPortAvailable correctly detects occupied port as NOT available', async () => {
    const isFree = await ServerManager.isPortAvailable(mockPort);
    expect(isFree).toBe(false);
  });

  test('isPortAvailable correctly detects an unused high-range port as available', async () => {
    const freePort = 39876;
    const isFree = await ServerManager.isPortAvailable(freePort);
    expect(isFree).toBe(true);
  });

  test('getAvailablePort does not return occupied preferred port', async () => {
    const port = await ServerManager.getAvailablePort(mockPort);
    expect(port).not.toBe(mockPort);
    expect(port).toBeGreaterThan(0);
  });

  test('verifyServerIdentity rejects foreign web application serving HTML', async () => {
    const isRaceSample = await ServerManager.verifyServerIdentity(mockPort);
    expect(isRaceSample).toBe(false);
  });

  test('verifyServerIdentity accepts server returning Race Sample identity signature', async () => {
    const raceSampleMockPort = 31986;
    const raceSampleServer = http.createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-App-Identity': 'race-samples-desktop',
        });
        res.end(JSON.stringify({ status: 'ok', app: 'race-samples' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => raceSampleServer.listen(raceSampleMockPort, '127.0.0.1', () => resolve()));
    try {
      const isRaceSample = await ServerManager.verifyServerIdentity(raceSampleMockPort);
      expect(isRaceSample).toBe(true);
    } finally {
      await new Promise<void>((resolve) => raceSampleServer.close(() => resolve()));
    }
  });
});
