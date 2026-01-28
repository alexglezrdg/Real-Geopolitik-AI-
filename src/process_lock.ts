/**
 * Process Lock - Prevents parallel executions
 * Uses .runlock file with PID + timestamp
 * Stale locks (> 30 min or dead PID) are auto-replaced
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const LOCK_FILE = path.join(process.cwd(), ".runlock");
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEBUG = (process.env.LOCK_DEBUG ?? "0") === "1";

interface LockData {
  pid: number;
  timestamp: number;
  hostname: string;
}

/**
 * Check if a process is still alive
 */
async function isProcessAlive(pid: number): Promise<boolean> {
  try {
    // On Unix: kill -0 checks if process exists without sending signal
    // On Windows: tasklist or similar
    if (process.platform === "win32") {
      const { stdout } = await execAsync(`tasklist | find "${pid}"`);
      return stdout.length > 0;
    } else {
      await execAsync(`kill -0 ${pid}`);
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Acquire lock: blocks if another process holds it (and is alive)
 */
export async function acquireLock(timeoutMs = 5000): Promise<void> {
  const startTime = Date.now();
  const currentPid = process.pid;
  const currentHost = os.hostname();
  const lockData: LockData = {
    pid: currentPid,
    timestamp: Date.now(),
    hostname: currentHost,
  };

  while (Date.now() - startTime < timeoutMs) {
    // Check if lock file exists
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const existingLock = JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8")) as LockData;

        // Check if lock is stale (timestamp too old)
        const lockAge = Date.now() - existingLock.timestamp;
        if (lockAge > LOCK_TIMEOUT_MS) {
          if (DEBUG) console.log(`[LOCK] Stale lock found (${lockAge}ms old), replacing...`);
          fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
          return;
        }

        // Check if process is still alive
        const alive = await isProcessAlive(existingLock.pid);
        if (!alive) {
          if (DEBUG) console.log(`[LOCK] Dead process lock found (PID ${existingLock.pid}), replacing...`);
          fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
          return;
        }

        // Lock held by live process, wait and retry
        if (DEBUG) console.log(`[LOCK] Lock held by PID ${existingLock.pid}, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      } catch (err) {
        if (DEBUG) console.log(`[LOCK] Error reading lock file: ${(err as Error).message}, replacing...`);
        fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
        return;
      }
    } else {
      // Lock file doesn't exist, create it
      fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
      if (DEBUG) console.log(`[LOCK] Lock acquired for PID ${currentPid}`);
      return;
    }
  }

  throw new Error(`Failed to acquire lock within ${timeoutMs}ms`);
}

/**
 * Release lock
 */
export function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8")) as LockData;
      if (lock.pid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
        if (DEBUG) console.log(`[LOCK] Lock released for PID ${process.pid}`);
      } else {
        if (DEBUG) console.log(`[LOCK] Lock file exists but not owned by this process, skipping release`);
      }
    }
  } catch (err) {
    if (DEBUG) console.log(`[LOCK] Error releasing lock: ${(err as Error).message}`);
  }
}

/**
 * Check lock status (for monitoring)
 */
export function checkLockStatus(): LockData | null {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      return JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8")) as LockData;
    }
  } catch {}
  return null;
}
