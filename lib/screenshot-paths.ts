/**
 * Centralized screenshot storage paths.
 * All screenshots saved to: <project_root>/public/live-screenshots/
 * Web-accessible at: /live-screenshots/<filename>
 */

import * as fs from 'fs';
import * as path from 'path';

export const LIVE_SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'live-screenshots');

/** Web-accessible path prefix (no leading slash for DB, with slash for URLs) */
export const WEB_PATH_PREFIX = 'live-screenshots';

export function ensureLiveScreenshotsDir(): void {
  if (!fs.existsSync(LIVE_SCREENSHOTS_DIR)) {
    fs.mkdirSync(LIVE_SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * Convert filename to DB-stored path (live-screenshots/filename).
 * DB stores web-accessible relative path.
 */
export function toDbFilePath(fileName: string): string {
  return `${WEB_PATH_PREFIX}/${fileName}`;
}

/**
 * Convert DB filePath to web URL (/live-screenshots/filename).
 * Handles both "filename" and "live-screenshots/filename" for backward compatibility.
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
  if (normalized.startsWith(WEB_PATH_PREFIX + '/')) {
    return path.join(process.cwd(), 'public', normalized);
  }
  return path.join(LIVE_SCREENSHOTS_DIR, normalized);
}
