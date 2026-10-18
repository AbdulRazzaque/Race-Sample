import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';
import http from 'http';
import fs from 'fs';

export class ServerManager {
  private static serverProcess: ChildProcess | null = null;
  private static serverPort: number = 3000;
  private static isStarting: boolean = false;

  /**
   * Finds a free port on localhost
   */
  public static async getAvailablePort(preferredPort: number = 3000): Promise<number> {
    const isPortAvailable = (port: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
          server.close(() => resolve(true));
        });
        server.listen(port, '127.0.0.1');
      });
    };

    if (await isPortAvailable(preferredPort)) {
      return preferredPort;
    }

    // Find any open dynamic port
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as net.AddressInfo;
        const port = address.port;
        server.close(() => resolve(port));
      });
    });
  }

  /**
   * Resolves the location of the Next.js standalone server script
   */
  public static getStandaloneServerPath(): string {
    if (!app.isPackaged) {
      // In development when testing standalone server
      return path.resolve(process.cwd(), '.next', 'standalone', 'server.js');
    }

    // In production packaged application:
    // electron-builder places extraResources in process.resourcesPath
    const candidatePaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
      path.join(process.resourcesPath, 'standalone', 'server.js'),
      path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js'),
      path.join(app.getAppPath(), '.next', 'standalone', 'server.js'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Default fallback
    return path.join(process.resourcesPath, 'standalone', 'server.js');
  }

  /**
   * Waits for the local Next.js server to start responding
   */
  private static async waitForServerReady(port: number, timeoutMs: number = 45000, getErrorContext?: () => string | null): Promise<void> {
    const startTime = Date.now();
    const url = `http://127.0.0.1:${port}/api/auth/session`;

    while (Date.now() - startTime < timeoutMs) {
      // If server process has already crashed/exited, fail immediately instead of hanging
      if (getErrorContext) {
        const failureReason = getErrorContext();
        if (failureReason) {
          throw new Error(`Next.js local server process terminated unexpectedly:\n\n${failureReason}`);
        }
      }

      try {
        const isReady = await new Promise<boolean>((resolve) => {
          const req = http.get(url, (res) => {
            // Any response (even 200, 302, 401, 404) means the HTTP server is alive
            resolve(res.statusCode !== undefined);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(1500, () => {
            req.destroy();
            resolve(false);
          });
        });

        if (isReady) {
          return;
        }
      } catch {}

      await new Promise((r) => setTimeout(r, 400));
    }

    const lastErr = getErrorContext ? getErrorContext() : null;
    throw new Error(`Next.js local server did not become ready within ${timeoutMs}ms on port ${port}.${lastErr ? '\n\n' + lastErr : ''}`);
  }

  /**
   * Starts the Next.js local server
   */
  public static async startServer(): Promise<{ url: string; port: number }> {
    if (this.serverProcess) {
      return { url: `http://127.0.0.1:${this.serverPort}`, port: this.serverPort };
    }

    // In development mode, check if dev server is already running on port 3000
    if (!app.isPackaged) {
      const devPort = 3000;
      const isDevRunning = await new Promise<boolean>((resolve) => {
        const req = http.get(`http://127.0.0.1:${devPort}`, (res) => resolve(res.statusCode !== undefined));
        req.on('error', () => resolve(false));
        req.setTimeout(1200, () => {
          req.destroy();
          resolve(false);
        });
      });

      if (isDevRunning) {
        console.log(`[ServerManager] Connecting to existing development server at http://127.0.0.1:${devPort}`);
        this.serverPort = devPort;
        return { url: `http://127.0.0.1:${devPort}`, port: devPort };
      }

      const candidateStandalone = this.getStandaloneServerPath();
      if (!fs.existsSync(candidateStandalone)) {
        console.log(`[ServerManager] Development mode: No standalone build detected. Starting Next.js dev server on port ${devPort}...`);
        this.serverPort = devPort;
        const nextCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        this.serverProcess = spawn(nextCmd, ['next', 'dev', '-p', String(devPort)], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PORT: String(devPort),
            HOSTNAME: '127.0.0.1',
          },
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });

        this.serverProcess.on('error', (err) => {
          console.error('[ServerManager] Dev server process error:', err);
        });

        this.serverProcess.stdout?.on('data', (chunk) => {
          console.log(`[NextDev] ${chunk.toString().trim()}`);
        });

        this.serverProcess.stderr?.on('data', (chunk) => {
          console.error(`[NextDev:Err] ${chunk.toString().trim()}`);
        });

        this.serverProcess.on('exit', (code, signal) => {
          console.log(`[ServerManager] Next.js dev server process exited with code ${code}, signal ${signal}`);
          this.serverProcess = null;
        });

        await this.waitForServerReady(this.serverPort, 45000);
        return {
          url: `http://127.0.0.1:${this.serverPort}`,
          port: this.serverPort,
        };
      }
    }

    this.serverPort = await this.getAvailablePort(3000);
    const serverScript = this.getStandaloneServerPath();
    const serverCwd = path.dirname(serverScript);

    if (!fs.existsSync(serverScript) || !fs.existsSync(serverCwd)) {
      throw new Error(
        `Standalone server files were not found at: ${serverScript}.\nPlease run "npm run build:app" before starting standalone server.`
      );
    }

    const userDataPath = app.getPath('userData');
    const databasePath = path.join(userDataPath, 'race_samples.db');
    const databaseUrl = 'file:' + databasePath.replace(/\\/g, '/');

    console.log(`[ServerManager] Starting standalone Next.js server on port ${this.serverPort}`);
    console.log(`[ServerManager] Server script path: ${serverScript}`);
    console.log(`[ServerManager] Persistent SQLite DB: ${databasePath}`);

    // Using Electron's own built-in Node.js runtime via ELECTRON_RUN_AS_NODE: 1
    // This guarantees the client DOES NOT need Node.js installed on their computer!
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(this.serverPort),
      HOSTNAME: '127.0.0.1',
      DATABASE_URL: databaseUrl,
      APP_USER_DATA_PATH: userDataPath,
      SESSION_SECRET: process.env.SESSION_SECRET || 'race_samples_super_secret_session_key_2026_qatar_first_lab_secure',
      APP_URL: `http://127.0.0.1:${this.serverPort}`,
    };

    this.serverProcess = spawn(process.execPath, [serverScript], {
      cwd: serverCwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let serverProcessExited = false;
    let serverExitCode: number | null = null;
    let serverExitSignal: string | null = null;
    let stderrChunks: string[] = [];

    this.serverProcess.on('error', (err) => {
      console.error('[ServerManager] Server process error:', err);
      stderrChunks.push(`Process launch error: ${err.message}`);
    });

    this.serverProcess.stdout?.on('data', (chunk) => {
      console.log(`[NextServer] ${chunk.toString().trim()}`);
    });

    this.serverProcess.stderr?.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      console.error(`[NextServer:Err] ${msg}`);
      stderrChunks.push(msg);
      if (stderrChunks.length > 20) stderrChunks.shift();
    });

    this.serverProcess.on('exit', (code, signal) => {
      console.log(`[ServerManager] Next.js server process exited with code ${code}, signal ${signal}`);
      serverProcessExited = true;
      serverExitCode = code;
      serverExitSignal = signal;
      this.serverProcess = null;
    });

    await this.waitForServerReady(this.serverPort, 45000, () => {
      if (serverProcessExited) {
        return `Process terminated with code ${serverExitCode} (signal: ${serverExitSignal || 'none'}).\n\nOutput:\n${stderrChunks.join('\n') || '(no error logs captured)'}`;
      }
      return null;
    });
    console.log(`[ServerManager] Next.js server successfully listening at http://127.0.0.1:${this.serverPort}`);

    return {
      url: `http://127.0.0.1:${this.serverPort}`,
      port: this.serverPort,
    };
  }

  /**
   * Gracefully terminates the running Next.js server process
   */
  public static stopServer(): void {
    if (this.serverProcess) {
      console.log('[ServerManager] Stopping Next.js server process...');
      try {
        if (process.platform === 'win32') {
          // Use taskkill on Windows to ensure child tree terminates cleanly
          spawn('taskkill', ['/pid', String(this.serverProcess.pid), '/T', '/F']);
        } else {
          this.serverProcess.kill('SIGTERM');
        }
      } catch (err) {
        console.error('[ServerManager] Error stopping server process:', err);
      }
      this.serverProcess = null;
    }
  }
}
