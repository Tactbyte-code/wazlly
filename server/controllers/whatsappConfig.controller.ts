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

import { Request, Response } from "express";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { asyncHandler } from "../middlewares/error.middleware";
import { db } from "../db";
import {
  whatsappBusinessAccountsConfig,
} from "@shared/schema";
import { eq, ne } from "drizzle-orm";

/* ======================================================
   ➤ Create / Save (Single Config Per User)
====================================================== */
export const saveWhatsappConfig =
  asyncHandler(async (req: Request, res: Response) => {
    const { appId, appSecret, configId } =
      req.body;

    if (!appId || !appSecret || !configId) {
      return res.status(400).json({
        message:
          "appId, appSecret, configId required",
      });
    }

    const userId =
      (req.session as any).user.id;

    let existing = await db.query
      .whatsappBusinessAccountsConfig
      .findFirst({
        where: ne(
          whatsappBusinessAccountsConfig.appId,
          ""
        ),
      });
    if (!existing) {
      existing = await db.query
        .whatsappBusinessAccountsConfig
        .findFirst();
    }

    /* ===============================
       ➤ UPDATE if exists
    =============================== */
    if (existing) {
      const updated = await db
        .update(
          whatsappBusinessAccountsConfig
        )
        .set({
          appId,
          appSecret,
          configId,
          createdBy: userId,
          updatedAt: new Date(),
        })
        .where(
          eq(
            whatsappBusinessAccountsConfig.id,
            existing.id
          )
        )
        .returning();

      return res.json({
        message:
          "Config updated successfully",
        data: updated[0],
      });
    }

    /* ===============================
       ➤ CREATE new config
    =============================== */
    const created = await db
      .insert(
        whatsappBusinessAccountsConfig
      )
      .values({
        appId,
        appSecret,
        configId,
        createdBy: userId,
      })
      .returning();

    res.json({
      message:
        "Config created successfully",
      data: created[0],
    });
  });

/* ======================================================
   ➤ Get My Config
====================================================== */
export const getMyWhatsappConfig =
  asyncHandler(async (req: Request, res: Response) => {
    let config;

    config = await db.query
      .whatsappBusinessAccountsConfig
      .findFirst({
        where: ne(
          whatsappBusinessAccountsConfig.appId,
          ""
        ),
      });
    if (!config) {
      config = await db.query
        .whatsappBusinessAccountsConfig
        .findFirst();
    }

    if (!config) {
      return res.status(404).json({
        message: "Config not found",
      });
    }

    res.json(config);
  });

/* ======================================================
   ➤ Update By ID (Optional manual update)
====================================================== */
export const updateWhatsappConfig =
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await db.query
      .whatsappBusinessAccountsConfig
      .findFirst({
        where: eq(
          whatsappBusinessAccountsConfig.id,
          id
        ),
      });

    if (!existing) {
      return res.status(404).json({
        message: "Config not found",
      });
    }

    const updated = await db
      .update(
        whatsappBusinessAccountsConfig
      )
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(
        eq(
          whatsappBusinessAccountsConfig.id,
          id
        )
      )
      .returning();

    res.json({
      message: "Config updated",
      data: updated[0],
    });
  });

/* ======================================================
   ➤ Delete My Config
====================================================== */
export const deleteWhatsappConfig =
  asyncHandler(async (req: Request, res: Response) => {
    let existing = await db.query
      .whatsappBusinessAccountsConfig
      .findFirst({
        where: ne(
          whatsappBusinessAccountsConfig.appId,
          ""
        ),
      });
    if (!existing) {
      existing = await db.query
        .whatsappBusinessAccountsConfig
        .findFirst();
    }

    if (!existing) {
      return res.status(404).json({
        message: "Config not found",
      });
    }

    await db
      .delete(
        whatsappBusinessAccountsConfig
      )
      .where(
        eq(
          whatsappBusinessAccountsConfig.id,
          existing.id
        )
      );

    res.json({
      success: true,
      message: "Config deleted",
    });
  });
