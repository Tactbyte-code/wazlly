/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// import * as schema from "@shared/schema";
// import 'dotenv/config';

// neonConfig.webSocketConstructor = ws;


import { Pool } from "pg";
import { DIPLOY_BRAND } from "@diploy/core";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import "dotenv/config";


if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX || '25', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

  pool.on('error', (err) => {
    console.error(`[${DIPLOY_BRAND}] Unexpected database pool error:`, err.message);
  });
  
  export const db = drizzle(pool, { schema });

  const readPool = process.env.DATABASE_READ_URL
    ? new Pool({
        connectionString: process.env.DATABASE_READ_URL,
        max: parseInt(process.env.DB_POOL_MAX || '25', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        allowExitOnIdle: true,
      })
    : pool;

  if (process.env.DATABASE_READ_URL) {
    readPool.on('error', (err) => {
      console.error(`[${DIPLOY_BRAND}] Unexpected read replica pool error:`, err.message);
    });
    console.log(`[${DIPLOY_BRAND}] Read replica database configured`);
  }

  export const dbRead = process.env.DATABASE_READ_URL
    ? drizzle(readPool, { schema })
    : db;

// export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle({ client: pool, schema });