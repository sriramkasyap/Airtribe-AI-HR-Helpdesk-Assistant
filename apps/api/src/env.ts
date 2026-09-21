import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Load the repo-root .env. This module is imported FIRST in index.ts so the
 * config is applied before any module-scope env reads (OPENROUTER_API_KEY,
 * JWT_SECRET, MONGODB_URI, ...).
 *
 * The path is resolved relative to this compiled file, not cwd, so it works
 * both via `tsx watch src/index.ts` (apps/api/src) and `node dist/index.js`
 * (apps/api/dist) — both are exactly three levels below the repo root.
 */
config({ path: resolve(__dirname, '../../../.env') });
