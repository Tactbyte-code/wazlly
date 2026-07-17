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
import { eq, desc, sql, lte } from "drizzle-orm";
import { 
  campaigns, 
  users,
  templates,
  type Campaign, 
  type InsertCampaign 
} from "@shared/schema";




export class CampaignRepository {
  async getAllold(page: number = 1, limit: number = 10): Promise<{
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
}> {
  const offset = (page - 1) * limit;

  // Fetch paginated campaign list
  const campaignsList = await db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch total count
  const totalResult = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(campaigns);

  return {
    data: campaignsList,
    total: totalResult[0]?.total ?? 0,
    page,
    limit,
  };
}





async getAll(
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;

  // const campaignsList = await db
  //   .select({
  //     id: campaigns.id,
  //     name: campaigns.name,
  //     createdBy: campaigns.createdBy,
  //     createdByName: sql<string>`
  //       CONCAT(
  //         COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, '')
  //       )
  //     `.as("createdByName"),
  //     status: campaigns.status,
  //     createdAt: campaigns.createdAt,
  //     updatedAt: campaigns.updatedAt,
  //   })
  //   .from(campaigns)
  //   // 👇 Cast campaigns.createdBy uuid → text for join
  //   .leftJoin(users, eq(users.id, sql`${campaigns.createdBy}::text`))
  //   .orderBy(desc(campaigns.createdAt))
  //   .limit(limit)
  //   .offset(offset);


 const campaignsList = await db
  .select({
    id: campaigns.id,
    name: campaigns.name,

    createdBy: campaigns.createdBy,

    createdByName: sql<string>`
      CONCAT(
        COALESCE(${users.firstName}, ''),
        ' ',
        COALESCE(${users.lastName}, '')
      )
    `.as("createdByName"),

    status: campaigns.status,

    // TEMPLATE
    templateId: campaigns.templateId,
    templateName: templates.name,

    // COUNTS
    recipientCount: campaigns.recipientCount,
    sentCount: campaigns.sentCount,
    deliveredCount: campaigns.deliveredCount,
    readCount: campaigns.readCount,
    failedCount: campaigns.failedCount,
    repliedCount: campaigns.repliedCount,

    createdAt: campaigns.createdAt,
    updatedAt: campaigns.updatedAt,
  })
  .from(campaigns)

  .leftJoin(users, eq(users.id, sql`${campaigns.createdBy}::text`))

  // ✅ TEMPLATE JOIN
  .leftJoin(templates, eq(templates.id, campaigns.templateId))

  .orderBy(desc(campaigns.createdAt))
  .limit(limit)
  .offset(offset);

  const totalResult = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(campaigns);

  return {
    data: campaignsList,
    total: totalResult[0]?.total ?? 0,
    page,
    limit,
  };
}


  // async getByChannel(channelId: string): Promise<Campaign[]> {
  //   return await db
  //     .select()
  //     .from(campaigns)
  //     .where(eq(campaigns.channelId, channelId))
  //     .orderBy(desc(campaigns.createdAt));
  // }


  async getByChannel(
  channelId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: Campaign[]; total: number; page: number; limit: number }> {
  const offset = (page - 1) * limit;

  // Fetch paginated campaigns
  const data = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.channelId, channelId))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch total count
  const [{ count }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(campaigns)
    .where(eq(campaigns.channelId, channelId));

  return {
    data,
    total: Number(count),
    page,
    limit,
  };
}


  async getById(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }


  // async getCampaignByUserId(userId: string): Promise<Campaign | undefined>{
  //   const [campaign] = await db.select().from(campaigns).where(eq(campaigns.createdBy, userId));
  //   return campaign || []
  // }

 async getCampaignByUserId(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;

  // const campaignsList = await db
  //   .select()
  //   .from(campaigns)
  //   .where(eq(campaigns.createdBy, userId))
  //   .orderBy(desc(campaigns.createdAt))
  //   .limit(Number(limit))
  //   .offset(Number(offset));

 const campaignsList = await db
  .select({
    id: campaigns.id,
    name: campaigns.name,

    createdBy: campaigns.createdBy,

    createdByName: sql<string>`
      CONCAT(
        COALESCE(${users.firstName}, ''),
        ' ',
        COALESCE(${users.lastName}, '')
      )
    `.as("createdByName"),

    status: campaigns.status,

    // TEMPLATE
    templateId: campaigns.templateId,
    templateName: templates.name,

    // COUNTS
    recipientCount: campaigns.recipientCount,
    sentCount: campaigns.sentCount,
    deliveredCount: campaigns.deliveredCount,
    readCount: campaigns.readCount,
    failedCount: campaigns.failedCount,
    repliedCount: campaigns.repliedCount,

    createdAt: campaigns.createdAt,
    updatedAt: campaigns.updatedAt,
  })
  .from(campaigns)

  .leftJoin(users, eq(users.id, sql`${campaigns.createdBy}::text`))

  .leftJoin(templates, eq(templates.id, campaigns.templateId))

  // ✅ IMPORTANT
  .where(eq(campaigns.createdBy, userId))

  .orderBy(desc(campaigns.createdAt))
  .limit(limit)
  .offset(offset);   

  const totalResult = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(campaigns)
    .where(eq(campaigns.createdBy, userId));

  return {
    data: campaignsList,
    total: totalResult[0]?.total ?? 0,
    page,
    limit
  };
}



  async create(insertCampaign: InsertCampaign & { createdBy: string }): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        ...insertCampaign,
        contactGroups: (insertCampaign.contactGroups || []) as string[],
      })
      .returning();
    return campaign;
  }

 async getScheduledCampaigns(now: Date) {
    return db
      .select()
      .from(campaigns)
      .where(
        sql`
          ${campaigns.status} = 'scheduled'
          AND ${campaigns.scheduledAt} IS NOT NULL
          AND ${campaigns.scheduledAt} <= ${now}
        `
      )
      .orderBy(campaigns.scheduledAt);
  }
  

  async update(id: string, campaign: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set(campaign)
      .where(eq(campaigns.id, id))
      .returning();
    return updated || undefined;
  }

  async incrementSentCount(id: string): Promise<void> {
    await db
      .update(campaigns)
      .set({ sentCount: sql`COALESCE(${campaigns.sentCount}, 0) + 1` })
      .where(eq(campaigns.id, id));
  }

  async incrementFailedCount(id: string): Promise<void> {
    await db
      .update(campaigns)
      .set({ failedCount: sql`COALESCE(${campaigns.failedCount}, 0) + 1` })
      .where(eq(campaigns.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
    return result.length > 0;
  }


   async getAllCampaignCount(): Promise<number> {
    const campaignsList = await db.select().from(campaigns);
    return campaignsList.length;
  }
}