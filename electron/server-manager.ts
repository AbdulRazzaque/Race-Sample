import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';
import http from 'http';
import fs from 'fs';

export class ServerManager {
  private static serverProcess: ChildProcess | null = null;
  private static serverPort: number = 39281;
  public static readonly DEFAULT_PRODUCTION_PORT: number = 39281;
  public static readonly DEFAULT_DEV_PORT: number = 3005;

  /**
   * Performs an exhaustive check to determine if a port is completely free on localhost.
   * Checks for:
   * 1. Active connection on 127.0.0.1 (connect fails => no server active)
   * 2. Active connection on ::1 (connect fails => no IPv6 server active)
   * 3. Ability to bind to 0.0.0.0 (catches processes bound to INADDR_ANY)
   * 4. Ability to bind to 127.0.0.1
   */
  public static async isPortAvailable(port: number): Promise<boolean> {
    // 1. Check if any process is already accepting connections on 127.0.0.1
    const canConnectIPv4 = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ port, host: '127.0.0.1' }, () => {
        socket.destroy();
        resolve(true); // Connected means port is occupied!
      });
      socket.on('error', () => resolve(false));
      socket.setTimeout(250, () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (canConnectIPv4) {
      return false;
    }

    // 2. Check if any process is accepting connections on IPv6 localhost
    const canConnectIPv6 = await new Promise<boolean>((resolve) => {
      const socket = net.connect({ port, host: '::1' }, () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      socket.setTimeout(250, () => {
        socket.destroy();
        resolve(false);
      });
    });

    if (canConnectIPv6) {
      return false;
    }

    // 3. Check if we can bind on 0.0.0.0 (wildcard)
    const canBindAll = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '0.0.0.0');
    });

    if (!canBindAll) {
      return false;
    }

    // 4. Check if we can bind specifically on 127.0.0.1
    const canBindLocal = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });

    return canBindLocal;
  }

  /**
   * Finds a guaranteed free port on localhost, preferring preferredPort if available.
   * If preferredPort is busy, dynamically allocates an ephemeral port from the OS.
   */
  public static async getAvailablePort(preferredPort?: number): Promise<number> {
    if (preferredPort && (await this.isPortAvailable(preferredPort))) {
      return preferredPort;
    }

    // Allocate an open dynamic port from the OS
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on('error', reject);
      server.listen(0, '127.0.0.1', async () => {
        const address = server.address() as net.AddressInfo;
        const port = address.port;
        server.close(async () => {
          // Double verify that the ephemeral port passes comprehensive checks
          if (await this.isPortAvailable(port)) {
            resolve(port);
          } else {
            // Fallback retry
            const secondAttempt = await this.getAvailablePort();
            resolve(secondAttempt);
          }
        });
      });
    });
  }

  /**
   * Resolves the location of the Next.js standalone server script
   */
  public static getStandaloneServerPath(): string {
    if (!app.isPackaged) {
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

    return path.join(process.resourcesPath, 'standalone', 'server.js');
  }

  /**
   * Confirms whether a server responding on localhost:port is authentically Race Sample
   * by verifying the dedicated health endpoint and response signature.
   * Prevents Electron from loading an unrelated third-party web application (e.g., Pharmacy).
   */
  public static async verifyServerIdentity(port: number): Promise<boolean> {
    const healthUrl = `http://127.0.0.1:${port}/api/health`;

    try {
      const isRaceSample = await new Promise<boolean>((resolve) => {
        const req = http.get(healthUrl, (res) => {
          const contentType = res.headers['content-type'] || '';
          const appIdentity = res.headers['x-app-identity'];

          // Immediate check for Race Sample identity header
          if (appIdentity === 'race-samples-desktop') {
            resolve(true);
            return;
          }

          // If content type is text/html, this is an SPA (like Pharmacy React app) or 404 page, NOT our API!
          if (contentType.includes('text/html')) {
            resolve(false);
            return;
          }

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json && (json.app === 'race-samples' || json.status === 'ok')) {
                resolve(true);
                return;
              }
            } catch {}
            resolve(false);
          });
        });

        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });

      if (isRaceSample) {
        return true;
      }

      // Fallback verification against auth session endpoint if health endpoint is not yet mounted
      const sessionUrl = `http://127.0.0.1:${port}/api/auth/session`;
      return await new Promise<boolean>((resolve) => {
        const req = http.get(sessionUrl, (res) => {
          const contentType = res.headers['content-type'] || '';
          // Foreign React SPAs serve 200 text/html fallback for unknown routes.
          // Race Sample API returns application/json with status 401 when unauthenticated.
          if (!contentType.includes('application/json')) {
            resolve(false);
            return;
          }

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json && ('authenticated' in json || json.error === 'Unauthorized')) {
                resolve(true);
                return;
              }
            } catch {}
            resolve(false);
          });
        });

        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Waits for the local Next.js server to start responding and verifies its identity.
   */
  private static async waitForServerReady(
    port: number,
    timeoutMs: number = 45000,
    getErrorContext?: () => string | null
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (getErrorContext) {
        const failureReason = getErrorContext();
        if (failureReason) {
          throw new Error(`Next.js local server process terminated unexpectedly:\n\n${failureReason}`);
        }
      }

      const isVerified = await this.verifyServerIdentity(port);
      if (isVerified) {
        return;
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    const lastErr = getErrorContext ? getErrorContext() : null;
    throw new Error(
      `Next.js local server did not become ready and pass identity verification within ${timeoutMs}ms on port ${port}.${
        lastErr ? '\n\n' + lastErr : ''
      }`
    );
  }

  /**
   * Starts the Next.js local server, ensuring strict separation between development and production.
   */
  public static async startServer(): Promise<{ url: string; port: number }> {
    if (this.serverProcess) {
      return { url: `http://127.0.0.1:${this.serverPort}`, port: this.serverPort };
    }

    // ==========================================
    // 1. DEVELOPMENT MODE (!app.isPackaged)
    // ==========================================
    if (!app.isPackaged) {
      const devPort = parseInt(process.env.DEV_PORT || String(this.DEFAULT_DEV_PORT), 10);

      // Verify if Race Sample dev server is already running on the configured dev port
      const isExistingDevVerified = await this.verifyServerIdentity(devPort);

      if (isExistingDevVerified) {
        console.log(`[ServerManager] Verified existing Race Sample development server at http://127.0.0.1:${devPort}`);
        this.serverPort = devPort;
        return { url: `http://127.0.0.1:${devPort}`, port: devPort };
      }

      // Check whether standalone build exists to test standalone in dev
      const candidateStandalone = this.getStandaloneServerPath();
      if (!fs.existsSync(candidateStandalone)) {
        // Find a free port for dev server
        const chosenDevPort = await this.getAvailablePort(devPort);
        console.log(`[ServerManager] Development mode: Starting Next.js dev server on port ${chosenDevPort}...`);
        this.serverPort = chosenDevPort;
        const nextCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        this.serverProcess = spawn(nextCmd, ['next', 'dev', '-p', String(chosenDevPort)], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PORT: String(chosenDevPort),
            HOSTNAME: '127.0.0.1',
            APP_URL: `http://127.0.0.1:${chosenDevPort}`,
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

    // ==========================================
    // 2. PRODUCTION STANDALONE SERVER
    // ==========================================
    // Allocate a dedicated port, never defaulting to port 3000
    this.serverPort = await this.getAvailablePort(this.DEFAULT_PRODUCTION_PORT);
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
    // Guarantees client does NOT need Node.js installed on their computer!
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
        return `Process terminated with code ${serverExitCode} (signal: ${serverExitSignal || 'none'}).\n\nOutput:\n${
          stderrChunks.join('\n') || '(no error logs captured)'
        }`;
      }
      return null;
    });

    console.log(`[ServerManager] Next.js server successfully verified and listening at http://127.0.0.1:${this.serverPort}`);

    return {
      url: `http://127.0.0.1:${this.serverPort}`,
      port: this.serverPort,
    };
  }

  /**
   * Gracefully terminates the running Next.js server process and all children
   */
  public static stopServer(): void {
    if (this.serverProcess) {
      console.log('[ServerManager] Stopping Next.js server process...');
      try {
        if (process.platform === 'win32' && this.serverProcess.pid) {
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
