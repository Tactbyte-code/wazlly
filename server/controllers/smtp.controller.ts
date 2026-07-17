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

import { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db } from '../db';
import { smtpConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendContactEmail, resetEmailCache } from 'server/services/email.service';
import { cacheGet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from '../services/cache';

export const upsertSMTPConfig = async (req: Request, res: Response) => {
  try {
    const {
      host,
      port: rawPort,
      secure,
      user,
      password,
      fromName,
      fromEmail,
      logo,
    } = req.body;

    const port = parseInt(rawPort, 10);

    // Check if a config already exists
    const configs = await db.select().from(smtpConfig).limit(1);
    const existingConfig = configs[0];

    const configData: any = {
      host,
      port,
      secure: secure === true || secure === "true",
      user,
      fromName,
      fromEmail,
      logo: logo || null,
      updatedAt: new Date(),
    };

    // ONLY update password if it's not empty
    if (password && password.trim() !== "") {
      configData.password = password;
    }

    let result;
    if (existingConfig) {
      // Update the existing record
      result = await db
        .update(smtpConfig)
        .set(configData)
        .where(eq(smtpConfig.id, existingConfig.id))
        .returning();
      console.log("SMTP configuration updated:", result[0].id);
    } else {
      // Insert new record
      result = await db
        .insert(smtpConfig)
        .values({
          ...configData,
          password: password || "", // required for new records
        })
        .returning();
      console.log("New SMTP configuration created:", result[0].id);
    }

    await cacheInvalidate(CACHE_KEYS.smtpConfig());
    resetEmailCache();

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('SMTP upsert error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to save SMTP config', error });
  }
};

// GET SMTP configuration
export const getSMTPConfigHandler = async (req: Request, res: Response) => {
  try {
    // Assuming there's only one SMTP config row
    const config = await db.select().from(smtpConfig).limit(1);

    if (!config || config.length === 0) {
      return res.status(404).json({
        success: false,
        message: "SMTP configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: config[0],
    });
  } catch (error) {
    console.error("SMTP fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SMTP configuration",
      error,
    });
  }
};


export const getSMTPConfig = async () => {
  return cacheGet(CACHE_KEYS.smtpConfig(), CACHE_TTL.smtpConfig, async () => {
    const configs = await db.select().from(smtpConfig).limit(1);
    if (!configs || configs.length === 0) {
      console.warn('⚠️ No SMTP configuration found');
      return null;
    }
    return configs[0];
  });
};



export const sendMailRoute = async (req: Request, res: Response) => {
  try {
    const { name, email, company, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const result = await sendContactEmail({
      name,
      email,
      company,
      subject,
      message,
    });

    console.log("Contact form email sent:", result);

    return res.json({
      success: true,
      message: "Message sent successfully",
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
}
