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

import { db } from "../db";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { sql } from "drizzle-orm";

export class DatabaseService {
  /**
   * Check database connection health
   */
  static async checkConnection(): Promise<{ healthy: boolean; details: any }> {
    try {
      const result = await db.execute(sql`SELECT 1 as health_check`);
      const connectionCount = await db.execute(sql`
        SELECT count(*) as connection_count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      
      return {
        healthy: true,
        details: {
          connectionTest: result.rows[0],
          activeConnections: connectionCount.rows[0],
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          error: error?.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats() {
    try {
      const tableStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);

      const databaseSize = await db.execute(sql`
        SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
      `);

      const indexUsage = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE idx_tup_read > 0
        ORDER BY idx_tup_read DESC
        LIMIT 10
      `);

      return {
        tableStats: tableStats.rows,
        databaseSize: databaseSize.rows[0],
        indexUsage: indexUsage.rows,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to get database stats: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  static async cleanupOldData() {
    try {
      const results = [];

      // Clean up old API logs (keep last 30 days)
      const apiLogsResult = await db.execute(sql`
        DELETE FROM api_logs 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);
      results.push({ table: 'api_logs', deleted: apiLogsResult.rowCount });

      // Clean up old analytics data (keep last 12 months)
      const analyticsResult = await db.execute(sql`
        DELETE FROM analytics 
        WHERE date < NOW() - INTERVAL '12 months'
      `);
      results.push({ table: 'analytics', deleted: analyticsResult.rowCount });

      // Clean up completed campaigns older than 6 months
      const campaignsResult = await db.execute(sql`
        DELETE FROM campaigns 
        WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '6 months'
      `);
      results.push({ table: 'campaigns', deleted: campaignsResult.rowCount });

      return {
        success: true,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to cleanup old data: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Optimize database performance
   */
  static async optimizeDatabase() {
    try {
      // Update table statistics
      await db.execute(sql`ANALYZE`);

      // Vacuum tables to reclaim space
      await db.execute(sql`VACUUM`);

      return {
        success: true,
        message: "Database optimization completed",
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to optimize database: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get slow queries for performance monitoring
   */
  static async getSlowQueries() {
    try {
      const slowQueries = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 100  -- queries taking more than 100ms on average
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      return slowQueries.rows;
    } catch (error: any) {
      // pg_stat_statements might not be enabled
      return [];
    }
  }

  /**
   * Create indexes for better performance if they don't exist
   */
  static async ensureOptimalIndexes() {
    try {
      const indexes = [
        // Contacts performance indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_phone_trgm_idx 
         ON contacts USING gin(phone gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS contacts_name_trgm_idx 
         ON contacts USING gin(name gin_trgm_ops)`,
        
        // Messages performance indexes
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_content_trgm_idx 
         ON messages USING gin(content gin_trgm_ops)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_timestamp_desc_idx 
         ON messages (timestamp DESC)`,
        
        // Campaigns performance indexes  
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS campaigns_name_trgm_idx 
         ON campaigns USING gin(name gin_trgm_ops)`,
        
        // Composite indexes for common queries
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_channel_status_idx 
         ON conversations (channel_id, status)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_conversation_timestamp_idx 
         ON messages (conversation_id, timestamp DESC)`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS campaign_recipients_campaign_status_idx 
         ON campaign_recipients (campaign_id, status)`,
      ];

      const results = [];
      for (const indexQuery of indexes) {
        try {
          await db.execute(sql.raw(indexQuery));
          results.push({ index: indexQuery.split(' ')[5], status: 'created' });
        } catch (error: any) {
          if (error?.message?.includes('already exists')) {
            results.push({ index: indexQuery.split(' ')[5], status: 'exists' });
          } else {
            results.push({ index: indexQuery.split(' ')[5], status: 'failed', error: error?.message || 'Unknown error' });
          }
        }
      }

      return {
        success: true,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to ensure optimal indexes: ${error?.message || 'Unknown error'}`);
    }
  }
}