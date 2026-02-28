/**
 * Centralized screenshot storage paths.
 * Uses SCREENSHOT_DIR for persistent storage (Coolify volume: /data/live-screenshots).
 * Web-accessible at: /live-screenshots/<filename>
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || '/data/live-screenshots';
export const LIVE_SCREENSHOTS_DIR = SCREENSHOT_DIR;

/** Web-accessible path prefix (no leading slash for DB, with slash for URLs) */
export const WEB_PATH_PREFIX = 'live-screenshots';

export function ensureLiveScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

/**
 * Convert filename to DB-stored path (/live-screenshots/filename).
 * DB stores web-accessible relative path only (never full filesystem path).
 */
export function toDbFilePath(fileName: string): string {
  return `/${WEB_PATH_PREFIX}/${fileName}`;
}

/**
 * Convert DB filePath to web URL (/live-screenshots/filename).
 * Handles both "filename", "live-screenshots/filename", and "/live-screenshots/filename" for backward compatibility.
 */
export function toWebUrl(filePath: string): string {
  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  if (normalized.startsWith(WEB_PATH_PREFIX + '/')) {
    return `/${normalized}`;
  }
  return `/${WEB_PATH_PREFIX}/${normalized}`;
}

/**
 * Resolve DB filePath to absolute filesystem path.
 */
export function toAbsolutePath(filePath: string): string {
  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const base = normalized.startsWith(WEB_PATH_PREFIX + '/')
    ? normalized.slice((WEB_PATH_PREFIX + '/').length)
    : normalized;
  return path.join(SCREENSHOT_DIR, base);
}
