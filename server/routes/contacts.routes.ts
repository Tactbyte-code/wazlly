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

import type { Express } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import * as contactsController from "../controllers/contacts.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { insertContactSchema , PERMISSIONS } from "@shared/schema";
import { extractChannelId } from "../middlewares/channel.middleware";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import { requireSubscription } from "server/middlewares/requireSubscription";

export function registerContactRoutes(app: Express) {
  // Get all contacts
  app.get("/api/contacts-all", 
  requireAuth,
  requirePermission(PERMISSIONS.CONTACTS_VIEW),
    extractChannelId,
    contactsController.getContacts
  );

  app.get("/api/contacts", 
  requireAuth,
  requirePermission(PERMISSIONS.CONTACTS_VIEW),
    extractChannelId,
    contactsController.getContactsWithPagination
  );

  // Get single contact
  app.get("/api/contacts/:id", requireAuth,
  requirePermission(PERMISSIONS.CONTACTS_VIEW), contactsController.getContact);

  // Create contact
  app.post("/api/contacts",
    extractChannelId, requireAuth,
    requirePermission(PERMISSIONS.CONTACTS_CREATE),requireSubscription('contacts'),
    validateRequest(insertContactSchema), 
    contactsController.createContact
  );


  app.get("/api/user/contacts/:userId", requireAuth, contactsController.getContactsByUser);

  // Update contact
  app.put(
    "/api/contacts/:id",
    requireAuth,
    requirePermission(PERMISSIONS.CONTACTS_EDIT),
    contactsController.updateContact
  );

  // Delete contact
  app.delete(
    "/api/contacts/:id",
    requireAuth,
    requirePermission(PERMISSIONS.CONTACTS_DELETE),
    contactsController.deleteContact
  );

  // Delete Bulk contact
  app.delete(
    "/api/contacts-bulk",
    requireAuth,
    requirePermission(PERMISSIONS.CONTACTS_DELETE),
    contactsController.deleteBulkContacts
  );

  // Import contacts
  app.post(
    "/api/contacts/import",
    requireAuth,
    requirePermission(PERMISSIONS.CONTACTS_EXPORT), // or CONTACTS_IMPORT if you defined it
    extractChannelId,requireSubscription('contacts'),
    contactsController.importContacts
  );
}