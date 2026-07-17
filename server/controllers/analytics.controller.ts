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

import type { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db, dbRead } from '../db';
import { messages, campaigns, conversations, channels, campaignRecipients, messageQueue } from '@shared/schema';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import { eq, and, gte, lte, count, sql, desc, inArray } from 'drizzle-orm';
import PDFDocument from 'pdfkit';
import ExcelJS from "exceljs";
import archiver from 'archiver';
import { storage } from 'server/storage';


// Get message analytics with real-time data
export const getMessageAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { channelId, days = '30', startDate, endDate } = req.query;
  
  const daysNum = parseInt(days as string, 10);
  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  const conditions = [];
  
  if (channelId) {
    conditions.push(eq(conversations.channelId, channelId as string));
  }
  
  conditions.push(gte(messages.createdAt, start));
  conditions.push(lte(messages.createdAt, end));

  // Get daily message statistics (outbound only for rate charts)
  const messageStats = await dbRead
    .select({
      date: sql<string>`DATE(${messages.createdAt})`,
      totalSent: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
      delivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
      pending: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'pending' THEN 1 END)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(sql`DATE(${messages.createdAt})`)
    .orderBy(sql`DATE(${messages.createdAt})`);

  // Get overall statistics
  const overallStats = await dbRead
    .select({
      totalMessages: count(messages.id),
      totalOutbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
      totalInbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)`,
      totalDelivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      totalRead: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
      totalFailed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
      // ✅ FIXED: sirf woh unique conversations count karo jahan outbound ke baad inbound aaya
      totalReplied: sql<number>`(
        SELECT COUNT(DISTINCT inb.conversation_id)
        FROM messages inb
        WHERE inb.direction = 'inbound'
          AND inb.status != 'failed'
          AND inb.created_at BETWEEN ${start} AND ${end}
          AND EXISTS (
            SELECT 1 FROM messages outb
            WHERE outb.conversation_id = inb.conversation_id
              AND outb.direction = 'outbound'
              AND outb.created_at < inb.created_at
          )
          AND inb.conversation_id IN (
            SELECT id FROM conversations
            ${channelId ? sql`WHERE channel_id = ${channelId as string}` : sql``}
          )
      )`,
      uniqueContacts: sql<number>`COUNT(DISTINCT ${conversations.contactPhone})`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions));

  // Calculate average response time (nearest inbound reply after each outbound message)
  let avgResponseResult: { avgResponseMs: number | null }[] = [{ avgResponseMs: null }];
  try {
    avgResponseResult = await dbRead
      .select({
        avgResponseMs: sql<number>`AVG(response_time_ms)`,
      })
      .from(sql`(
        SELECT EXTRACT(EPOCH FROM (first_reply.created_at - outb.created_at)) * 1000 AS response_time_ms
        FROM messages outb
        INNER JOIN conversations c ON outb.conversation_id = c.id
        CROSS JOIN LATERAL (
          SELECT inb.created_at
          FROM messages inb
          WHERE inb.conversation_id = outb.conversation_id
            AND inb.direction = 'inbound'
            AND inb.created_at > outb.created_at
            AND inb.created_at <= ${end}
            AND inb.status != 'failed'
          ORDER BY inb.created_at ASC
          LIMIT 1
        ) first_reply
        WHERE outb.direction = 'outbound'
          ${channelId ? sql`AND c.channel_id = ${channelId as string}` : sql``}
          AND outb.created_at >= ${start}
          AND outb.created_at <= ${end}
          AND EXTRACT(EPOCH FROM (first_reply.created_at - outb.created_at)) BETWEEN 0 AND 86400
        ) sub`);
  } catch (e) {
    // If the query fails, we just don't have response time data
  }

  // Get message type breakdown
  const messageTypes = await dbRead
    .select({
      direction: messages.direction,
      count: count(messages.id),
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(messages.direction);

  // Get hourly distribution
  const hourlyDistribution = await dbRead
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${messages.createdAt})`,
      count: count(messages.id),
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`)
    .orderBy(sql`EXTRACT(HOUR FROM ${messages.createdAt})`);

  const avgResponseMs = avgResponseResult[0]?.avgResponseMs || null;
  let avgResponseTime: string | null = null;
  if (avgResponseMs) {
    const totalSeconds = Math.round(avgResponseMs / 1000);
    if (totalSeconds < 60) {
      avgResponseTime = `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
      avgResponseTime = `${Math.round(totalSeconds / 60)}m`;
    } else {
      avgResponseTime = `${(totalSeconds / 3600).toFixed(1)}h`;
    }
  }

  res.json({
    dailyStats: messageStats,
    overall: overallStats[0] || {},
    messageTypes,
    hourlyDistribution,
    avgResponseTime,
    period: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days: daysNum,
    },
  });
});

// Get campaign analytics
// export const getCampaignAnalytics = asyncHandler(async (req: Request, res: Response) => {
//   const { channelId } = req.query;
  
//   const conditions = [];
//   if (channelId) {
//     conditions.push(eq(campaigns.channelId, channelId as string));
//   }

//   // Get campaign performance data - simplified query
//   const campaignStats = await dbRead
//     .select()
//     .from(campaigns)
//     .where(conditions.length > 0 ? and(...conditions) : undefined)
//     .orderBy(desc(campaigns.createdAt));

//   // const campaignsWithRates = campaignStats.map((campaign: any) => ({
//   //   ...campaign,
//   //   deliveryRate: (campaign.sentCount && campaign.sentCount > 0)
//   //     ? Math.min(((campaign.deliveredCount || 0) / campaign.sentCount) * 100, 100)
//   //     : 0,
//   //   readRate: (campaign.deliveredCount && campaign.deliveredCount > 0)
//   //     ? Math.min(((campaign.readCount || 0) / campaign.deliveredCount) * 100, 100)
//   //     : 0,
//   //   replyRate: (campaign.deliveredCount && campaign.deliveredCount > 0)
//   //     ? Math.min(((campaign.repliedCount || 0) / campaign.deliveredCount) * 100, 100)
//   //     : 0,
//   // }));

//   const campaignsWithRates = campaignStats.map((campaign: any) => {
//   const sent = Number(campaign.sentCount || 0);
//   const delivered = Number(campaign.deliveredCount || 0);
//   const read = Number(campaign.readCount || 0);
//   const replied = Number(campaign.repliedCount || 0);

//   return {
//     ...campaign,

//     deliveryRate:
//       sent > 0
//         ? Number(((delivered / sent) * 100).toFixed(2))
//         : 0,

//     readRate:
//       delivered > 0
//         ? Number(((Math.min(read, delivered) / delivered) * 100).toFixed(2))
//         : 0,

//     replyRate:
//       delivered > 0
//         ? Number(((Math.min(replied, delivered) / delivered) * 100).toFixed(2))
//         : 0,
//   };
// });

//   // Calculate aggregated stats in JavaScript
//   const aggregatedStats = campaignStats.reduce((acc: any, campaign: any) => ({
//     totalCampaigns: acc.totalCampaigns + 1,
//     activeCampaigns: acc.activeCampaigns + (campaign.status === 'active' ? 1 : 0),
//     completedCampaigns: acc.completedCampaigns + (campaign.status === 'completed' ? 1 : 0),
//     totalRecipients: acc.totalRecipients + (campaign.recipientCount || 0),
//     totalSent: acc.totalSent + (campaign.sentCount || 0),
//     totalDelivered: acc.totalDelivered + (campaign.deliveredCount || 0),
//     totalRead: acc.totalRead + (campaign.readCount || 0),
//     totalReplied: acc.totalReplied + (campaign.repliedCount || 0),
//     totalFailed: acc.totalFailed + (campaign.failedCount || 0),
//   }), {
//     totalCampaigns: 0,
//     activeCampaigns: 0,
//     completedCampaigns: 0,
//     totalRecipients: 0,
//     totalSent: 0,
//     totalDelivered: 0,
//     totalRead: 0,
//     totalReplied: 0,
//     totalFailed: 0,
//   });

//   res.json({
//     campaigns: campaignsWithRates,
//     summary: aggregatedStats,
//   });
// });



export const getCampaignAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.query;

  const conditions = [];
  if (channelId) {
    conditions.push(eq(campaigns.channelId, channelId as string));
  }

  const campaignStats = await dbRead
    .select()
    .from(campaigns)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(campaigns.createdAt));

  const campaignsWithRates = campaignStats.map((campaign: any) => {
    const recipient = Number(campaign.recipientCount || 0);
    const sent = Number(campaign.sentCount || 0);
    const delivered = Number(campaign.deliveredCount || 0);
    const read = Number(campaign.readCount || 0);
    const replied = Number(campaign.repliedCount || 0);

    return {
      ...campaign,
      deliveryRate: recipient > 0
        ? Number(((delivered / recipient) * 100).toFixed(2))
        : 0,
      readRate: delivered > 0
        ? Number(((read / delivered) * 100).toFixed(2))
        : 0,
      replyRate: delivered > 0
        ? Number(((replied / delivered) * 100).toFixed(2))
        : 0,
    };
  });

  const aggregatedStats = campaignStats.reduce(
    (acc: any, campaign: any) => ({
      totalCampaigns: acc.totalCampaigns + 1,
      activeCampaigns:
        acc.activeCampaigns + (campaign.status === "active" ? 1 : 0),
      completedCampaigns:
        acc.completedCampaigns + (campaign.status === "completed" ? 1 : 0),
      totalRecipients:
        acc.totalRecipients + Number(campaign.recipientCount || 0),
      totalSent: acc.totalSent + Number(campaign.sentCount || 0),
      totalDelivered:
        acc.totalDelivered + Number(campaign.deliveredCount || 0),
      totalRead: acc.totalRead + Number(campaign.readCount || 0),
      totalReplied: acc.totalReplied + Number(campaign.repliedCount || 0),
      totalFailed: acc.totalFailed + Number(campaign.failedCount || 0),
    }),
    {
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      totalRecipients: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalReplied: 0,
      totalFailed: 0,
    }
  );

  res.json({
    campaigns: campaignsWithRates,
    summary: aggregatedStats,
  });
});

// Get individual campaign analytics
export const getCampaignAnalyticsById = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  // Get campaign details
  const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

  // Get daily message stats for this campaign
  const endDate = new Date();
  const startDate = new Date(campaign.createdAt || new Date());
  
  const dailyStats = await dbRead
    .select({
      date: sql<string>`DATE(${messages.timestamp})`,
      sent: count(messages.id),
      delivered: sql<number>`COUNT(CASE WHEN ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messages.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messages.status} = 'failed' THEN 1 END)`,
    })
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .groupBy(sql`DATE(${messages.timestamp})`)
    .orderBy(sql`DATE(${messages.timestamp})`);

  // Get recipient status distribution
  const recipientStats = await dbRead
    .select({
      status: messages.status,
      count: count(messages.id),
    })
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .groupBy(messages.status);

  // Get error analysis
  const errorAnalysis = await dbRead
    .select({
      errorCode: sql<string>`${messages.errorDetails}->>'code'`,
      errorMessage: sql<string>`${messages.errorDetails}->>'message'`,
      count: count(messages.id),
    })
    .from(messages)
    .where(and(
      eq(messages.campaignId, campaignId),
      eq(messages.status, 'failed')
    ))
    .groupBy(sql`${messages.errorDetails}->>'code'`, sql`${messages.errorDetails}->>'message'`)
    .orderBy(desc(count(messages.id)));
  res.status(200).json({
    campaign,
    dailyStats,
    recipientStats,
    errorAnalysis,
  });
});

// Get individual campaign details
export const getCampaignDetails = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  const campaign = await dbRead
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign.length) {
    throw new AppError(404, 'Campaign not found');
  }

  // Get message statistics for this campaign
  const messageStats = await dbRead
    .select({
      date: sql<string>`DATE(${messages.createdAt})`,
      sent: count(messages.id),
      delivered: sql<number>`COUNT(CASE WHEN ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messages.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messages.status} = 'failed' THEN 1 END)`,
    })
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .groupBy(sql`DATE(${messages.createdAt})`)
    .orderBy(sql`DATE(${messages.createdAt})`);

  // Get recipient performance
  const recipientStats = await dbRead
    .select({
      status: messages.status,
      count: count(messages.id),
    })
    .from(messages)
    .where(eq(messages.campaignId, campaignId))
    .groupBy(messages.status);

  // Get error analysis
  const errorAnalysis = await dbRead
    .select({
      errorCode: messages.errorCode,
      errorMessage: messages.errorMessage,
      count: count(messages.id),
    })
    .from(messages)
    .where(and(
      eq(messages.campaignId, campaignId),
      eq(messages.status, 'failed')
    ))
    .groupBy(messages.errorCode, messages.errorMessage);

  res.json({
    campaign: campaign[0],
    dailyStats: messageStats,
    recipientStats,
    errorAnalysis,
  });
});

// ============================================================
// Comprehensive Export (CSV / Excel / PDF)
// ============================================================

const MAX_EXPORT_ROWS = 50000;
const CONTENT_PREVIEW_LEN = 200;
const DEMO_USERNAMES = new Set(['demoadmin', 'demouser']);

type ExportFormat = 'csv' | 'excel' | 'pdf';

type ExportCellValue = string | number | Date | null | undefined;
type ExportRow = Record<string, ExportCellValue>;
type ExportColumn = { header: string; key: string; width?: number };

interface ExportTable {
  title?: string;
  columns: ExportColumn[];
  rows: ExportRow[];
}

interface ExportSection {
  name: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  notes?: string[];
  // Optional additional tables rendered inside the same section (CSV: appended
  // to same file with a blank-line + title separator; Excel: appended to same
  // sheet with a gap + title row; PDF: appended after the main table).
  subTables?: ExportTable[];
}

function getSessionUser(req: Request): any | null {
  return ((req as any).session?.user as any) || null;
}

async function userCanAccessChannel(user: any, channelId: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (!channelId) return true;
  if (user.role === 'superadmin') return true;
  const ownerId = user.role === 'team' ? user.createdBy : user.id;
  if (!ownerId) return false;
  try {
    const userChannels = await storage.getChannelsByUserId(ownerId);
    return userChannels.some((ch: any) => ch.id === channelId);
  } catch (e) {
    console.error('userCanAccessChannel lookup failed:', e);
    return false;
  }
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().replace('T', ' ').slice(0, 19);
}

function fmtDateOnly(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function preview(text: string | null | undefined): string {
  if (!text) return '';
  const flat = String(text).replace(/\r?\n/g, ' ').trim();
  return flat.length > CONTENT_PREVIEW_LEN ? flat.slice(0, CONTENT_PREVIEW_LEN) + '…' : flat;
}

function pct(num: number, den: number): string {
  if (!den || den <= 0) return '0.0%';
  return Math.min((num / den) * 100, 100).toFixed(1) + '%';
}

function safeFilename(s: string): string {
  return (s || 'export').replace(/[^a-z0-9_\-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'export';
}

// ----- CSV -----
function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : (v instanceof Date ? fmtDate(v) : String(v));
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function appendTableLines(lines: string[], cols: ExportColumn[], rows: ExportRow[]) {
  lines.push(cols.map(c => csvEscape(c.header)).join(','));
  for (const row of rows) {
    lines.push(cols.map(c => csvEscape(row[c.key])).join(','));
  }
}

function sectionToCsv(section: ExportSection): string {
  const lines: string[] = [];
  if (section.notes && section.notes.length) {
    for (const note of section.notes) lines.push(csvEscape('# ' + note));
    lines.push('');
  }
  appendTableLines(lines, section.columns, section.rows);
  if (section.subTables) {
    for (const sub of section.subTables) {
      lines.push('');
      if (sub.title) lines.push(csvEscape('# ' + sub.title));
      appendTableLines(lines, sub.columns, sub.rows);
    }
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

async function writeCsv(res: Response, sections: ExportSection[], filenameBase: string) {
  if (sections.length === 1) {
    const csv = sectionToCsv(sections[0]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
    res.send(csv);
    return;
  }
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.zip"`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('analytics export: archiver error:', err);
    try { res.destroy(err); } catch (destroyErr) {
      console.error('analytics export: failed to destroy response:', destroyErr);
    }
  });
  archive.pipe(res);
  for (const section of sections) {
    archive.append(sectionToCsv(section), { name: `${safeFilename(section.name)}.csv` });
  }
  await archive.finalize();
}

// ----- Excel -----
async function writeExcel(res: Response, sections: ExportSection[], filenameBase: string, _title: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Whatsway';
  wb.created = new Date();
  for (const section of sections) {
    const ws = wb.addWorksheet(section.name.slice(0, 31));
    const colCountMax = Math.max(
      section.columns.length,
      ...(section.subTables?.map(t => t.columns.length) ?? [0]),
    );
    const colWidths: number[] = new Array(colCountMax).fill(10);

    let cursor = 1;
    if (section.notes && section.notes.length) {
      for (const note of section.notes) {
        const c = ws.getCell(cursor, 1);
        c.value = note;
        c.font = { italic: true, color: { argb: 'FF888888' } };
        cursor++;
      }
      cursor++; // gap row
    }

    const writeTable = (cols: ExportColumn[], rows: ExportRow[]): number => {
      const headerRow = ws.getRow(cursor);
      cols.forEach((col, i) => { headerRow.getCell(i + 1).value = col.header; });
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
      const headerRowIndex = cursor;
      cursor++;
      rows.forEach(row => {
        const xlRow = ws.getRow(cursor);
        cols.forEach((col, i) => { xlRow.getCell(i + 1).value = row[col.key] ?? ''; });
        cursor++;
      });
      cols.forEach((col, i) => {
        let maxLen = String(col.header || '').length;
        for (const r of rows) {
          const v = r[col.key];
          const s = v === null || v === undefined ? '' : String(v);
          if (s.length > maxLen) maxLen = s.length;
          if (maxLen > 60) { maxLen = 60; break; }
        }
        if (maxLen > colWidths[i]) colWidths[i] = maxLen;
      });
      return headerRowIndex;
    };

    const firstHeaderRow = writeTable(section.columns, section.rows);
    ws.views = [{ state: 'frozen', ySplit: firstHeaderRow }];

    if (section.subTables) {
      for (const sub of section.subTables) {
        cursor++; // gap
        if (sub.title) {
          const t = ws.getCell(cursor, 1);
          t.value = sub.title;
          t.font = { bold: true };
          cursor++;
        }
        writeTable(sub.columns, sub.rows);
      }
    }

    for (let i = 0; i < colWidths.length; i++) {
      ws.getColumn(i + 1).width = Math.max(10, Math.min(colWidths[i] + 2, 60));
    }
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
  const buffer = await wb.xlsx.writeBuffer();
  res.send(Buffer.from(buffer));
}

// ----- PDF -----
function drawPdfTableBody(doc: PDFKit.PDFDocument, cols: ExportColumn[], rows: ExportRow[]) {
  const margin = 40;
  const pageWidth = doc.page.width - margin * 2;
  if (rows.length === 0) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#888').text('No data.', margin);
    doc.fillColor('#000');
    doc.moveDown();
    return;
  }
  const totalWeight = cols.reduce((s, c) => s + (c.width || 1), 0);
  const colWidths = cols.map(c => Math.floor(((c.width || 1) / totalWeight) * pageWidth));
  const cellPad = 3;
  const fontSize = 8;
  const lineHeight = fontSize + 2;

  const drawHeader = () => {
    const y = doc.y;
    let maxLines = 1;
    for (let i = 0; i < cols.length; i++) {
      doc.fontSize(fontSize).font('Helvetica-Bold');
      const lines = Math.max(1, doc.heightOfString(cols[i].header, { width: colWidths[i] - cellPad * 2 }) / lineHeight);
      maxLines = Math.max(maxLines, Math.ceil(lines));
    }
    const rowH = maxLines * lineHeight + cellPad * 2;
    doc.rect(margin, y, pageWidth, rowH).fill('#EFEFEF').fillColor('#000');
    let x = margin;
    for (let i = 0; i < cols.length; i++) {
      doc.fontSize(fontSize).font('Helvetica-Bold').fillColor('#000')
        .text(cols[i].header, x + cellPad, y + cellPad, { width: colWidths[i] - cellPad * 2 });
      x += colWidths[i];
    }
    doc.moveTo(margin, y + rowH).lineTo(margin + pageWidth, y + rowH).strokeColor('#999').stroke();
    doc.y = y + rowH;
  };
  drawHeader();

  for (const row of rows) {
    doc.fontSize(fontSize).font('Helvetica');
    const cellValues = cols.map(c => {
      const v = row[c.key];
      return v === null || v === undefined ? '' : String(v);
    });
    let maxLines = 1;
    cellValues.forEach((val, i) => {
      const h = doc.heightOfString(val, { width: colWidths[i] - cellPad * 2 });
      maxLines = Math.max(maxLines, Math.ceil(h / lineHeight));
    });
    const rowH = maxLines * lineHeight + cellPad * 2;
    if (doc.y + rowH > doc.page.height - margin - 20) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = margin;
    cellValues.forEach((val, i) => {
      doc.text(val, x + cellPad, y + cellPad, { width: colWidths[i] - cellPad * 2, height: rowH - cellPad * 2 });
      x += colWidths[i];
    });
    doc.moveTo(margin, y + rowH).lineTo(margin + pageWidth, y + rowH).strokeColor('#DDD').stroke();
    doc.y = y + rowH;
  }
  doc.moveDown(1);
}

function drawPdfTable(doc: PDFKit.PDFDocument, section: ExportSection) {
  const margin = 40;
  doc.fontSize(14).font('Helvetica-Bold').text(section.name, margin, doc.y);
  doc.moveDown(0.3);
  if (section.notes && section.notes.length) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#888');
    for (const note of section.notes) doc.text(note, margin);
    doc.fillColor('#000');
    doc.moveDown(0.3);
  }
  drawPdfTableBody(doc, section.columns, section.rows);
  if (section.subTables) {
    for (const sub of section.subTables) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      if (sub.title) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text(sub.title, margin);
        doc.moveDown(0.3);
      }
      drawPdfTableBody(doc, sub.columns, sub.rows);
    }
  }
}

async function writePdf(res: Response, sections: ExportSection[], filenameBase: string, title: string, subtitle: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
  doc.pipe(res);
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').fillColor('#555').text(subtitle, { align: 'center' });
  doc.fillColor('#000');
  doc.moveDown(1);
  for (let i = 0; i < sections.length; i++) {
    if (i > 0) doc.addPage();
    drawPdfTable(doc, sections[i]);
  }
  // Page numbers
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(8).fillColor('#888').text(
      `Page ${p + 1} of ${range.count}`,
      0,
      doc.page.height - 20,
      { align: 'center', width: doc.page.width }
    );
    doc.page.margins.bottom = oldBottom;
  }
  doc.end();
}

// ----- Data builders -----

async function fetchAnalyticsExportSections(opts: {
  channelId?: string;
  allowedChannelIds?: string[]; // when set (non-superadmin), restrict to these
  start: Date;
  end: Date;
  channelName?: string;
}): Promise<ExportSection[]> {
  const { channelId, allowedChannelIds, start, end, channelName } = opts;

  const msgConditions: any[] = [
    gte(messages.createdAt, start),
    lte(messages.createdAt, end),
  ];
  if (channelId) {
    msgConditions.push(eq(conversations.channelId, channelId));
  } else if (allowedChannelIds) {
    // Restrict to the user's accessible channels (avoids exposing other tenants)
    if (allowedChannelIds.length === 0) {
      msgConditions.push(sql`FALSE`);
    } else {
      msgConditions.push(inArray(conversations.channelId, allowedChannelIds));
    }
  }

  // Overall summary
  const overallRows = await dbRead
    .select({
      totalMessages: count(messages.id),
      totalOutbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
      totalInbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)`,
      totalDelivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      totalRead: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
      totalFailed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
      totalReplied: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' AND ${messages.status} != 'failed' THEN 1 END)`,
      uniqueContacts: sql<number>`COUNT(DISTINCT ${conversations.contactPhone})`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...msgConditions));
  const overall = overallRows[0] ?? {
    totalMessages: 0,
    totalOutbound: 0,
    totalInbound: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    totalReplied: 0,
    uniqueContacts: 0,
  };

  // Average response time (best-effort; matches getMessageAnalytics)
  let avgResponseLabel = '—';
  try {
    let channelFilterSql: any = sql``;
    if (channelId) {
      channelFilterSql = sql`AND c.channel_id = ${channelId}`;
    } else if (allowedChannelIds && allowedChannelIds.length > 0) {
      channelFilterSql = sql`AND c.channel_id IN ${allowedChannelIds}`;
    } else if (allowedChannelIds && allowedChannelIds.length === 0) {
      channelFilterSql = sql`AND FALSE`;
    }
    const arRows = await dbRead.select({
      avgResponseMs: sql<number>`AVG(response_time_ms)`,
    }).from(sql`(
      SELECT EXTRACT(EPOCH FROM (first_reply.created_at - outb.created_at)) * 1000 AS response_time_ms
      FROM messages outb
      INNER JOIN conversations c ON outb.conversation_id = c.id
      CROSS JOIN LATERAL (
        SELECT inb.created_at FROM messages inb
        WHERE inb.conversation_id = outb.conversation_id
          AND inb.direction = 'inbound'
          AND inb.created_at > outb.created_at
          AND inb.created_at <= ${end}
          AND inb.status != 'failed'
        ORDER BY inb.created_at ASC LIMIT 1
      ) first_reply
      WHERE outb.direction = 'outbound'
        ${channelFilterSql}
        AND outb.created_at >= ${start}
        AND outb.created_at <= ${end}
        AND EXTRACT(EPOCH FROM (first_reply.created_at - outb.created_at)) BETWEEN 0 AND 86400
    ) sub`);
    const ms = Number(arRows[0]?.avgResponseMs) || 0;
    if (ms > 0) {
      const s = Math.round(ms / 1000);
      avgResponseLabel = s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${(s / 3600).toFixed(1)}h`;
    }
  } catch (e) {
    // Non-fatal: avg response time is a nice-to-have; fall back to '—'.
    console.warn('analytics export: avg response time query failed:', e);
  }

  // Daily rollup
  const daily = await dbRead
    .select({
      date: sql<string>`DATE(${messages.createdAt})`,
      totalMessages: count(messages.id),
      outbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' THEN 1 END)`,
      inbound: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'inbound' THEN 1 END)`,
      delivered: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messages.direction} = 'outbound' AND ${messages.status} = 'failed' THEN 1 END)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(...msgConditions))
    .groupBy(sql`DATE(${messages.createdAt})`)
    .orderBy(sql`DATE(${messages.createdAt})`);

  // Per-message rows (capped)
  const messageRows = await dbRead
    .select({
      createdAt: messages.createdAt,
      direction: messages.direction,
      status: messages.status,
      type: messages.type,
      content: messages.content,
      whatsappMessageId: messages.whatsappMessageId,
      errorCode: messages.errorCode,
      errorMessage: messages.errorMessage,
      campaignId: messages.campaignId,
      contactName: conversations.contactName,
      contactPhone: conversations.contactPhone,
      channelId: conversations.channelId,
      channelName: channels.name,
      channelPhone: channels.phoneNumber,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .leftJoin(channels, eq(conversations.channelId, channels.id))
    .where(and(...msgConditions))
    .orderBy(desc(messages.createdAt))
    .limit(MAX_EXPORT_ROWS + 1);

  const truncated = messageRows.length > MAX_EXPORT_ROWS;
  const cappedMessages = truncated ? messageRows.slice(0, MAX_EXPORT_ROWS) : messageRows;

  // Map campaignIds to names
  const campaignIds = Array.from(new Set(cappedMessages.map(m => m.campaignId).filter(Boolean))) as string[];
  let campaignNameById = new Map<string, string>();
  if (campaignIds.length) {
    const camps = await dbRead.select({ id: campaigns.id, name: campaigns.name })
      .from(campaigns).where(inArray(campaigns.id, campaignIds));
    campaignNameById = new Map(camps.map(c => [c.id, c.name]));
  }

  // Per-campaign rows for the time window (overlap = createdAt in range OR scheduledAt in range OR completedAt in range)
  const campaignConditions: any[] = [];
  if (channelId) {
    campaignConditions.push(eq(campaigns.channelId, channelId));
  } else if (allowedChannelIds) {
    if (allowedChannelIds.length === 0) {
      campaignConditions.push(sql`FALSE`);
    } else {
      campaignConditions.push(inArray(campaigns.channelId, allowedChannelIds));
    }
  }
  campaignConditions.push(sql`(
    (${campaigns.createdAt} BETWEEN ${start} AND ${end}) OR
    (${campaigns.scheduledAt} BETWEEN ${start} AND ${end}) OR
    (${campaigns.completedAt} BETWEEN ${start} AND ${end})
  )`);
  const campaignRows = await dbRead
    .select()
    .from(campaigns)
    .where(and(...campaignConditions))
    .orderBy(desc(campaigns.createdAt));

  // ---- Build sections ----

  const summarySection: ExportSection = {
    name: 'Summary',
    columns: [
      { header: 'Metric', key: 'metric', width: 2 },
      { header: 'Value', key: 'value', width: 1 },
    ],
    notes: [
      `Channel: ${channelName || 'All channels'}`,
      `Date range: ${fmtDateOnly(start)} → ${fmtDateOnly(end)}`,
      ...(truncated ? [`Truncated to ${MAX_EXPORT_ROWS.toLocaleString()} message rows (newest first). Narrow the range to see more.`] : []),
    ],
    rows: [
      { metric: 'Total messages', value: Number(overall.totalMessages) || 0 },
      { metric: 'Outbound', value: Number(overall.totalOutbound) || 0 },
      { metric: 'Inbound', value: Number(overall.totalInbound) || 0 },
      { metric: 'Delivered', value: Number(overall.totalDelivered) || 0 },
      { metric: 'Read', value: Number(overall.totalRead) || 0 },
      { metric: 'Failed', value: Number(overall.totalFailed) || 0 },
      { metric: 'Replied (inbound)', value: Number(overall.totalReplied) || 0 },
      { metric: 'Unique contacts', value: Number(overall.uniqueContacts) || 0 },
      { metric: 'Delivery rate', value: pct(Number(overall.totalDelivered) || 0, Number(overall.totalOutbound) || 0) },
      { metric: 'Read rate', value: pct(Number(overall.totalRead) || 0, Number(overall.totalDelivered) || 0) },
      { metric: 'Failure rate', value: pct(Number(overall.totalFailed) || 0, Number(overall.totalOutbound) || 0) },
      { metric: 'Avg response time', value: avgResponseLabel },
    ],
    subTables: [
      {
        title: 'Daily Roll-up',
        columns: [
          { header: 'Date', key: 'date', width: 1 },
          { header: 'Total Messages', key: 'totalMessages', width: 1 },
          { header: 'Outbound', key: 'outbound', width: 1 },
          { header: 'Inbound', key: 'inbound', width: 1 },
          { header: 'Delivered', key: 'delivered', width: 1 },
          { header: 'Read', key: 'read', width: 1 },
          { header: 'Failed', key: 'failed', width: 1 },
        ],
        rows: daily.map(d => ({
          date: d.date,
          totalMessages: Number(d.totalMessages) || 0,
          outbound: Number(d.outbound) || 0,
          inbound: Number(d.inbound) || 0,
          delivered: Number(d.delivered) || 0,
          read: Number(d.read) || 0,
          failed: Number(d.failed) || 0,
        })),
      },
    ],
  };

  const messagesSection: ExportSection = {
    name: 'Messages',
    columns: [
      { header: 'Date/Time', key: 'createdAt', width: 2 },
      { header: 'Direction', key: 'direction', width: 1 },
      { header: 'Status', key: 'status', width: 1 },
      { header: 'Contact Name', key: 'contactName', width: 2 },
      { header: 'Contact Phone', key: 'contactPhone', width: 2 },
      { header: 'Type', key: 'type', width: 1 },
      { header: 'Content Preview', key: 'content', width: 5 },
      { header: 'Campaign', key: 'campaignName', width: 2 },
      { header: 'Channel', key: 'channelName', width: 2 },
      { header: 'Channel Phone', key: 'channelPhone', width: 2 },
      { header: 'WhatsApp Message ID', key: 'whatsappMessageId', width: 3 },
      { header: 'Error Code', key: 'errorCode', width: 1 },
      { header: 'Error Message', key: 'errorMessage', width: 3 },
    ],
    notes: truncated ? [`Truncated to ${MAX_EXPORT_ROWS.toLocaleString()} rows (newest first).`] : undefined,
    rows: cappedMessages.map(m => ({
      createdAt: fmtDate(m.createdAt),
      direction: m.direction || '',
      status: m.status || '',
      contactName: m.contactName || '',
      contactPhone: m.contactPhone || '',
      type: m.type || '',
      content: preview(m.content),
      campaignName: m.campaignId ? (campaignNameById.get(m.campaignId) || '') : '',
      channelName: m.channelName || '',
      channelPhone: m.channelPhone || '',
      whatsappMessageId: m.whatsappMessageId || '',
      errorCode: m.errorCode || '',
      errorMessage: m.errorMessage || '',
    })),
  };

  const campaignsSection: ExportSection = {
    name: 'Campaigns',
    columns: [
      { header: 'Name', key: 'name', width: 3 },
      { header: 'Type', key: 'type', width: 1 },
      { header: 'Status', key: 'status', width: 1 },
      { header: 'Template', key: 'template', width: 2 },
      { header: 'Created', key: 'createdAt', width: 2 },
      { header: 'Scheduled', key: 'scheduledAt', width: 2 },
      { header: 'Completed', key: 'completedAt', width: 2 },
      { header: 'Recipients', key: 'recipientCount', width: 1 },
      { header: 'Sent', key: 'sentCount', width: 1 },
      { header: 'Delivered', key: 'deliveredCount', width: 1 },
      { header: 'Read', key: 'readCount', width: 1 },
      { header: 'Replied', key: 'repliedCount', width: 1 },
      { header: 'Failed', key: 'failedCount', width: 1 },
      { header: 'Delivery %', key: 'deliveryRate', width: 1 },
      { header: 'Read %', key: 'readRate', width: 1 },
      { header: 'Failure %', key: 'failureRate', width: 1 },
    ],
    rows: campaignRows.map((c) => ({
      name: c.name,
      type: c.type,
      status: c.status,
      template: c.templateName || '',
      createdAt: fmtDate(c.createdAt),
      scheduledAt: fmtDate(c.scheduledAt),
      completedAt: fmtDate(c.completedAt),
      recipientCount: c.recipientCount || 0,
      sentCount: c.sentCount || 0,
      deliveredCount: c.deliveredCount || 0,
      readCount: c.readCount || 0,
      repliedCount: c.repliedCount || 0,
      failedCount: c.failedCount || 0,
      deliveryRate: pct(c.deliveredCount || 0, c.sentCount || 0),
      readRate: pct(c.readCount || 0, c.deliveredCount || 0),
      failureRate: pct(c.failedCount || 0, c.sentCount || 0),
    })),
  };

  return [summarySection, messagesSection, campaignsSection];
}

// async function fetchCampaignExportSections(campaignId: string): Promise<{ sections: ExportSection[]; campaignName: string; channelId: string | null; createdAt: Date | null; completedAt: Date | null } | null> {
//   const camp = (await dbRead.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1))[0];
//   if (!camp) return null;

//   // Recipients (capped)
//   const recipients = await dbRead
//     .select({
//       name: campaignRecipients.name,
//       phone: campaignRecipients.phone,
//       status: campaignRecipients.status,
//       sentAt: campaignRecipients.sentAt,
//       deliveredAt: campaignRecipients.deliveredAt,
//       readAt: campaignRecipients.readAt,
//       errorCode: campaignRecipients.errorCode,
//       errorMessage: campaignRecipients.errorMessage,
//       whatsappMessageId: campaignRecipients.whatsappMessageId,
//     })
//     .from(campaignRecipients)
//     .where(eq(campaignRecipients.campaignId, campaignId))
//     .orderBy(desc(campaignRecipients.createdAt))
//     .limit(MAX_EXPORT_ROWS + 1);

//   const truncated = recipients.length > MAX_EXPORT_ROWS;
//   const cappedRecipients = truncated ? recipients.slice(0, MAX_EXPORT_ROWS) : recipients;

//   // Daily rollup of campaign messages
//   const daily = await dbRead
//     .select({
//       date: sql<string>`DATE(${messages.createdAt})`,
//       sent: count(messages.id),
//       delivered: sql<number>`COUNT(CASE WHEN ${messages.status} IN ('delivered', 'read') THEN 1 END)`,
//       read: sql<number>`COUNT(CASE WHEN ${messages.status} = 'read' THEN 1 END)`,
//       failed: sql<number>`COUNT(CASE WHEN ${messages.status} = 'failed' THEN 1 END)`,
//     })
//     .from(messages)
//     .where(eq(messages.campaignId, campaignId))
//     .groupBy(sql`DATE(${messages.createdAt})`)
//     .orderBy(sql`DATE(${messages.createdAt})`);

//   // Error breakdown
//   const errors = await dbRead
//     .select({
//       errorCode: campaignRecipients.errorCode,
//       errorMessage: campaignRecipients.errorMessage,
//       count: count(campaignRecipients.id),
//     })
//     .from(campaignRecipients)
//     .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, 'failed')))
//     .groupBy(campaignRecipients.errorCode, campaignRecipients.errorMessage)
//     .orderBy(desc(count(campaignRecipients.id)));

//   const summary: ExportSection = {
//     name: 'Campaign Summary',
//     columns: [
//       { header: 'Field', key: 'field', width: 2 },
//       { header: 'Value', key: 'value', width: 3 },
//     ],
//     notes: truncated ? [`Truncated to ${MAX_EXPORT_ROWS.toLocaleString()} recipients (newest first).`] : undefined,
//     rows: [
//       { field: 'Name', value: camp.name },
//       { field: 'Type', value: camp.type },
//       { field: 'Campaign type', value: camp.campaignType },
//       { field: 'Status', value: camp.status },
//       { field: 'Template', value: camp.templateName || '' },
//       { field: 'Created', value: fmtDate(camp.createdAt) },
//       { field: 'Scheduled', value: fmtDate(camp.scheduledAt) },
//       { field: 'Completed', value: fmtDate(camp.completedAt) },
//       { field: 'Recipients', value: camp.recipientCount || 0 },
//       { field: 'Sent', value: camp.sentCount || 0 },
//       { field: 'Delivered', value: camp.deliveredCount || 0 },
//       { field: 'Read', value: camp.readCount || 0 },
//       { field: 'Replied', value: camp.repliedCount || 0 },
//       { field: 'Failed', value: camp.failedCount || 0 },
//       { field: 'Delivery rate', value: pct(camp.deliveredCount || 0, camp.sentCount || 0) },
//       { field: 'Read rate', value: pct(camp.readCount || 0, camp.deliveredCount || 0) },
//       { field: 'Failure rate', value: pct(camp.failedCount || 0, camp.sentCount || 0) },
//     ],
//   };

//   const recipientsSection: ExportSection = {
//     name: 'Recipients',
//     columns: [
//       { header: 'Contact Name', key: 'name', width: 2 },
//       { header: 'Phone', key: 'phone', width: 2 },
//       { header: 'Status', key: 'status', width: 1 },
//       { header: 'Sent At', key: 'sentAt', width: 2 },
//       { header: 'Delivered At', key: 'deliveredAt', width: 2 },
//       { header: 'Read At', key: 'readAt', width: 2 },
//       { header: 'WhatsApp Message ID', key: 'whatsappMessageId', width: 3 },
//       { header: 'Error Code', key: 'errorCode', width: 1 },
//       { header: 'Error Message', key: 'errorMessage', width: 3 },
//     ],
//     rows: cappedRecipients.map(r => ({
//       name: r.name || '',
//       phone: r.phone || '',
//       status: r.status || '',
//       sentAt: fmtDate(r.sentAt),
//       deliveredAt: fmtDate(r.deliveredAt),
//       readAt: fmtDate(r.readAt),
//       whatsappMessageId: r.whatsappMessageId || '',
//       errorCode: r.errorCode || '',
//       errorMessage: r.errorMessage || '',
//     })),
//   };

//   const dailySection: ExportSection = {
//     name: 'Daily Rollup',
//     columns: [
//       { header: 'Date', key: 'date', width: 1 },
//       { header: 'Sent', key: 'sent', width: 1 },
//       { header: 'Delivered', key: 'delivered', width: 1 },
//       { header: 'Read', key: 'read', width: 1 },
//       { header: 'Failed', key: 'failed', width: 1 },
//     ],
//     rows: daily.map(d => ({
//       date: d.date,
//       sent: Number(d.sent) || 0,
//       delivered: Number(d.delivered) || 0,
//       read: Number(d.read) || 0,
//       failed: Number(d.failed) || 0,
//     })),
//   };

//   const errorsSection: ExportSection = {
//     name: 'Errors',
//     columns: [
//       { header: 'Error Code', key: 'errorCode', width: 1 },
//       { header: 'Error Message', key: 'errorMessage', width: 4 },
//       { header: 'Count', key: 'count', width: 1 },
//     ],
//     rows: errors.map(e => ({
//       errorCode: e.errorCode || '(none)',
//       errorMessage: e.errorMessage || '',
//       count: Number(e.count) || 0,
//     })),
//   };

//   return {
//     sections: [summary, recipientsSection, dailySection, errorsSection],
//     campaignName: camp.name,
//     channelId: camp.channelId,
//     createdAt: camp.createdAt ?? null,
//     completedAt: camp.completedAt ?? null,
//   };
// }


async function fetchCampaignExportSections(campaignId: string): Promise<{
  sections: ExportSection[];
  campaignName: string;
  channelId: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
} | null> {
  const camp = (
    await dbRead
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
  )[0];
  if (!camp) return null;

  // ✅ Recipients from message_queue
  const recipients = await dbRead
    .select({
      phone: messageQueue.recipientPhone,
      status: messageQueue.status,
      processedAt: messageQueue.processedAt,
      deliveredAt: messageQueue.deliveredAt,
      readAt: messageQueue.readAt,
      whatsappMessageId: messageQueue.whatsappMessageId,
      sentVia: messageQueue.sentVia,
      attempts: messageQueue.attempts,
      errorCode: messageQueue.errorCode,
      errorMessage: messageQueue.errorMessage,
    })
    .from(messageQueue)
    .where(eq(messageQueue.campaignId, campaignId))
    .orderBy(desc(messageQueue.createdAt))
    .limit(MAX_EXPORT_ROWS + 1);

  const truncated = recipients.length > MAX_EXPORT_ROWS;
  const cappedRecipients = truncated
    ? recipients.slice(0, MAX_EXPORT_ROWS)
    : recipients;

  // ✅ Daily rollup from message_queue
  const daily = await dbRead
    .select({
      date: sql<string>`DATE(${messageQueue.createdAt})`,
      sent: sql<number>`COUNT(CASE WHEN ${messageQueue.status} IN ('sent', 'delivered', 'read', 'failed') THEN 1 END)`,
      delivered: sql<number>`COUNT(CASE WHEN ${messageQueue.status} IN ('delivered', 'read') THEN 1 END)`,
      read: sql<number>`COUNT(CASE WHEN ${messageQueue.status} = 'read' THEN 1 END)`,
      failed: sql<number>`COUNT(CASE WHEN ${messageQueue.status} = 'failed' THEN 1 END)`,
    })
    .from(messageQueue)
    .where(eq(messageQueue.campaignId, campaignId))
    .groupBy(sql`DATE(${messageQueue.createdAt})`)
    .orderBy(sql`DATE(${messageQueue.createdAt})`);

  // ✅ Errors from message_queue
  const errors = await dbRead
    .select({
      errorCode: messageQueue.errorCode,
      errorMessage: messageQueue.errorMessage,
      count: count(messageQueue.id),
    })
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.campaignId, campaignId),
        eq(messageQueue.status, "failed")
      )
    )
    .groupBy(messageQueue.errorCode, messageQueue.errorMessage)
    .orderBy(desc(count(messageQueue.id)));

  const summary: ExportSection = {
    name: "Campaign Summary",
    columns: [
      { header: "Field", key: "field", width: 2 },
      { header: "Value", key: "value", width: 3 },
    ],
    notes: truncated
      ? [`Truncated to ${MAX_EXPORT_ROWS.toLocaleString()} recipients (newest first).`]
      : undefined,
    rows: [
      { field: "Name", value: camp.name },
      { field: "Type", value: camp.type },
      { field: "Campaign type", value: camp.campaignType },
      { field: "Status", value: camp.status },
      { field: "Template", value: camp.templateName || "" },
      { field: "Created", value: fmtDate(camp.createdAt) },
      { field: "Scheduled", value: fmtDate(camp.scheduledAt) },
      { field: "Completed", value: fmtDate(camp.completedAt) },
      { field: "Recipients", value: camp.recipientCount || 0 },
      { field: "Sent", value: camp.sentCount || 0 },
      { field: "Delivered", value: camp.deliveredCount || 0 },
      { field: "Read", value: camp.readCount || 0 },
      { field: "Replied", value: camp.repliedCount || 0 },
      { field: "Failed", value: camp.failedCount || 0 },
      { field: "Delivery rate", value: pct(camp.deliveredCount || 0, camp.sentCount || 0) },
      { field: "Read rate", value: pct(camp.readCount || 0, camp.deliveredCount || 0) },
      { field: "Failure rate", value: pct(camp.failedCount || 0, camp.sentCount || 0) },
    ],
  };

  const recipientsSection: ExportSection = {
    name: "Recipients",
    columns: [
      { header: "Phone", key: "phone", width: 2 },
      { header: "Status", key: "status", width: 1 },
      { header: "Sent Via", key: "sentVia", width: 1 },
      { header: "Processed At", key: "processedAt", width: 2 },
      { header: "Delivered At", key: "deliveredAt", width: 2 },
      { header: "Read At", key: "readAt", width: 2 },
      { header: "WhatsApp Message ID", key: "whatsappMessageId", width: 3 },
      { header: "Attempts", key: "attempts", width: 1 },
      { header: "Error Code", key: "errorCode", width: 1 },
      { header: "Error Message", key: "errorMessage", width: 3 },
    ],
    rows: cappedRecipients.map((r) => ({
      phone: r.phone || "",
      status: r.status || "",
      sentVia: r.sentVia || "",
      processedAt: fmtDate(r.processedAt),
      deliveredAt: fmtDate(r.deliveredAt),
      readAt: fmtDate(r.readAt),
      whatsappMessageId: r.whatsappMessageId || "",
      attempts: r.attempts ?? 0,
      errorCode: r.errorCode || "",
      errorMessage: r.errorMessage || "",
    })),
    notes: truncated
      ? [`Truncated to ${MAX_EXPORT_ROWS.toLocaleString()} recipients (newest first).`]
      : undefined,
  };

  const dailySection: ExportSection = {
    name: "Daily Rollup",
    columns: [
      { header: "Date", key: "date", width: 1 },
      { header: "Sent", key: "sent", width: 1 },
      { header: "Delivered", key: "delivered", width: 1 },
      { header: "Read", key: "read", width: 1 },
      { header: "Failed", key: "failed", width: 1 },
    ],
    rows: daily.map((d) => ({
      date: d.date,
      sent: Number(d.sent) || 0,
      delivered: Number(d.delivered) || 0,
      read: Number(d.read) || 0,
      failed: Number(d.failed) || 0,
    })),
  };

  const errorsSection: ExportSection = {
    name: "Errors",
    columns: [
      { header: "Error Code", key: "errorCode", width: 1 },
      { header: "Error Message", key: "errorMessage", width: 4 },
      { header: "Count", key: "count", width: 1 },
    ],
    rows: errors.map((e) => ({
      errorCode: e.errorCode || "(none)",
      errorMessage: e.errorMessage || "",
      count: Number(e.count) || 0,
    })),
  };

  return {
    sections: [summary, recipientsSection, dailySection, errorsSection],
    campaignName: camp.name,
    channelId: camp.channelId,
    createdAt: camp.createdAt ?? null,
    completedAt: camp.completedAt ?? null,
  };
}

// ----- Controller -----

export const exportAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = getSessionUser(req);
  if (!user) throw new AppError(401, 'Not authenticated');
  if (user.username && DEMO_USERNAMES.has(user.username)) {
    throw new AppError(403, 'Export not available for demo accounts');
  }

  const formatRaw = String(req.query.format || 'pdf').toLowerCase();
  if (formatRaw !== 'csv' && formatRaw !== 'excel' && formatRaw !== 'pdf') {
    throw new AppError(400, 'Invalid export format');
  }
  const format: ExportFormat = formatRaw;

  const type = String(req.query.type || 'all');
  const channelIdQ = typeof req.query.channelId === 'string' && req.query.channelId.trim() ? req.query.channelId.trim() : undefined;
  const campaignIdQ = typeof req.query.campaignId === 'string' && req.query.campaignId.trim() ? req.query.campaignId.trim() : undefined;

  // Per-campaign export
  if (type === 'campaigns' && campaignIdQ) {
    const data = await fetchCampaignExportSections(campaignIdQ);
    if (!data) throw new AppError(404, 'Campaign not found');
    if (data.channelId && !(await userCanAccessChannel(user, data.channelId))) {
      throw new AppError(403, 'Access denied to this campaign');
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const filenameBase = `campaign-${safeFilename(data.campaignName)}-${dateStr}`;
    if (format === 'csv') return writeCsv(res, data.sections, filenameBase);
    if (format === 'excel') return writeExcel(res, data.sections, filenameBase, `Campaign: ${data.campaignName}`);
    let campChannelName: string | undefined;
    if (data.channelId) {
      try {
        const ch = await dbRead.select({ name: channels.name }).from(channels).where(eq(channels.id, data.channelId)).limit(1);
        campChannelName = ch[0]?.name;
      } catch (e) {
        console.warn('analytics export: campaign channel name lookup failed:', e);
      }
    }
    const rangeStart = data.createdAt ? fmtDateOnly(data.createdAt) : '—';
    const rangeEnd = fmtDateOnly(data.completedAt ?? new Date());
    const campSubtitle = `${campChannelName || 'All channels'} • ${rangeStart} → ${rangeEnd} • Generated ${fmtDate(new Date())}`;
    return writePdf(res, data.sections, filenameBase, `Campaign: ${data.campaignName}`, campSubtitle);
  }

  // Workspace-wide export
  if (channelIdQ && !(await userCanAccessChannel(user, channelIdQ))) {
    throw new AppError(403, 'Access denied to this channel');
  }

  // For non-superadmin without an explicit channelId, restrict to their accessible channels
  let allowedChannelIds: string[] | undefined;
  if (!channelIdQ && user.role !== 'superadmin') {
    const ownerId = user.role === 'team' ? user.createdBy : user.id;
    if (!ownerId) {
      allowedChannelIds = [];
    } else {
      try {
        const userChannels = await storage.getChannelsByUserId(ownerId);
        allowedChannelIds = userChannels.map((c) => c.id);
      } catch (e) {
        console.error('analytics export: getChannelsByUserId failed:', e);
        allowedChannelIds = [];
      }
    }
  }

  const daysNum = parseInt(String(req.query.days || '30'), 10);
  const safeDays = Number.isFinite(daysNum) && daysNum > 0 ? daysNum : 30;
  const start = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const end = req.query.endDate ? new Date(String(req.query.endDate)) : new Date();

  let channelName: string | undefined;
  if (channelIdQ) {
    try {
      const ch = await dbRead.select({ name: channels.name }).from(channels).where(eq(channels.id, channelIdQ)).limit(1);
      channelName = ch[0]?.name;
    } catch (e) {
      console.warn('analytics export: channel name lookup failed:', e);
    }
  }

  const sections = await fetchAnalyticsExportSections({
    channelId: channelIdQ,
    allowedChannelIds,
    start,
    end,
    channelName,
  });

  const filenameBase = `whatsway-analytics-${fmtDateOnly(start)}_to_${fmtDateOnly(end)}`;
  const subtitle = `${channelName || 'All channels'} • ${fmtDateOnly(start)} → ${fmtDateOnly(end)} • Generated ${fmtDate(new Date())}`;

  if (format === 'csv') return writeCsv(res, sections, filenameBase);
  if (format === 'excel') return writeExcel(res, sections, filenameBase, 'Whatsway Analytics');
  return writePdf(res, sections, filenameBase, 'Whatsway Analytics Report', subtitle);
});
