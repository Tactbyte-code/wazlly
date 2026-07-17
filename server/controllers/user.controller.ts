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
import { db } from "../db";
import {users, channels} from "@shared/schema";
import { eq, or, like, sql, and, desc, gte, inArray, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { otpVerifications } from "@shared/schema";
import { sendOTPEmailVerify } from "../services/email.service";
import { resolveUserPermissions } from "server/utils/role-permissions";
import { z } from "zod";

// Validation schema for user self/admin updates. Applied before pickAllowed so
// that malformed values (wrong types, bad email, over-long strings) are
// rejected with a clear 400 instead of silently reaching the DB layer.
const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
    avatar: z.string().max(2048).optional(),
    phone: z.string().trim().max(32).optional(),
    username: z.string().trim().min(1).max(100).optional(),
    permissions: z.union([z.array(z.string()), z.record(z.boolean())]).optional(),
    isEmailVerified: z.boolean().optional(),
  })
  .strict()
  .partial();

const updateUserStatusSchema = z
  .object({
    status: z.enum(["active", "inactive"]),
  })
  .strict();


// Default permissions 
    const defaultPermissions = [
      // Contacts
      'contacts:view',
      'contacts:create',
      'contacts:edit',
      'contacts:delete',
      'contacts:export',

      // Campaigns
      'campaigns:view',
      'campaigns:create',
      'campaigns:edit',
      'campaigns:delete',

      // Templates
      'templates:view',
      'templates:create',
      'templates:edit',
      'templates:delete',

      // Analytics
      'analytics:view',

      // Team
      'team:view',
      'team:create',
      'team:edit',
      'team:delete',

      // Settings
      'settings:view',

      // Inbox
      'inbox:view',
      'inbox:send',
      'inbox:assign',

      // Automations
      'automations:view',
      'automations:create',
      'automations:edit',
      'automations:delete',
    ];


export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = (req.query.role as string) || "admin";
    const status = (req.query.status as string) || "";
    const hasChannels = (req.query.hasChannels as string) || "";
    const dateRange = (req.query.dateRange as string) || "";
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(users.role, role),
      search ? or(
        like(users.username, sql`${'%' + search + '%'}`),
        like(users.email, sql`${'%' + search + '%'}`)
      ) : undefined,
      status ? eq(users.status, status) : undefined,
    ].filter(Boolean);

    if (dateRange === "week") {
      conditions.push(gte(users.createdAt, sql`NOW() - INTERVAL '7 days'`));
    } else if (dateRange === "month") {
      conditions.push(gte(users.createdAt, sql`NOW() - INTERVAL '30 days'`));
    }

    const channelCountSql = sql<number>`(
      SELECT CAST(COUNT(*) AS INTEGER) FROM channels ch
      WHERE ch.created_by = users.id
    )`.as("channelCount");

    if (hasChannels === "yes") {
      conditions.push(sql`(SELECT COUNT(*) FROM channels ch WHERE ch.created_by = users.id) > 0`);
    } else if (hasChannels === "no") {
      conditions.push(sql`(SELECT COUNT(*) FROM channels ch WHERE ch.created_by = users.id) = 0`);
    }

    let baseQuery = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatar: users.avatar,
        status: users.status,
        permissions: users.permissions,
        channelId: users.channelId,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        createdBy: users.createdBy,
        fcmToken: users.fcmToken,
        isEmailVerified: users.isEmailVerified,
        stripeCustomerId: users.stripeCustomerId,
        razorpayCustomerId: users.razorpayCustomerId,
        channelCount: channelCountSql,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    const allUsers = await (baseQuery as any).limit(limit).offset(offset);

    const countQuery = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(users)
      .where(and(...conditions));

    const totalCountResult = await countQuery;
    const total = totalCountResult[0]?.total ?? 0;

    res.status(200).json({
      success: true,
      data: allUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Error fetching users", error });
  }
};

export const exportAllUsers = async (req: Request, res: Response) => {
  try {
    const role = (req.query.role as string) || "admin";
    const search = (req.query.search as string) || "";
    const statusFilter = (req.query.status as string) || "";
    const hasChannels = (req.query.hasChannels as string) || "";
    const dateRange = (req.query.dateRange as string) || "";

    const conditions: any[] = [
      eq(users.role, role),
      search ? or(
        like(users.username, sql`${'%' + search + '%'}`),
        like(users.email, sql`${'%' + search + '%'}`)
      ) : undefined,
      statusFilter ? eq(users.status, statusFilter) : undefined,
    ].filter(Boolean);

    if (dateRange === "week") {
      conditions.push(gte(users.createdAt, sql`NOW() - INTERVAL '7 days'`));
    } else if (dateRange === "month") {
      conditions.push(gte(users.createdAt, sql`NOW() - INTERVAL '30 days'`));
    }

    const exportChannelCountSql = sql<number>`(
      SELECT CAST(COUNT(*) AS INTEGER) FROM channels ch
      WHERE ch.created_by = users.id
    )`.as("channelCount");

    const exportChannelNamesSql = sql<string>`(
      SELECT COALESCE(STRING_AGG(COALESCE(ch.name, ch.phone_number, 'Unknown'), ', '), '')
      FROM channels ch
      WHERE ch.created_by = users.id
    )`.as("channelNames");

    if (hasChannels === "yes") {
      conditions.push(sql`(SELECT COUNT(*) FROM channels ch WHERE ch.created_by = users.id) > 0`);
    } else if (hasChannels === "no") {
      conditions.push(sql`(SELECT COUNT(*) FROM channels ch WHERE ch.created_by = users.id) = 0`);
    }

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        status: users.status,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        channelCount: exportChannelCountSql,
        channelNames: exportChannelNamesSql,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    const allUsers = await query;

    res.status(200).json({ success: true, data: allUsers });
  } catch (error) {
    console.error("Error exporting users:", error);
    res.status(500).json({ success: false, message: "Error exporting users" });
  }
};

export const bulkUpdateUserStatus = async (req: Request, res: Response) => {
  try {
    const caller = (req.session as any)?.user;
    if (!caller) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (caller.role !== "superadmin" && caller.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { userIds, status } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "userIds array is required" });
    }

    const allowed = ["active", "inactive", "banned"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(", ")}` });
    }

    // Authority check: admins may only update users they created (their tenant).
    // Superadmins may update any user. Prevent self-status-change (locking
    // yourself out) and cross-tenant modifications.
    const targets = await db
      .select({ id: users.id, createdBy: users.createdBy, role: users.role })
      .from(users)
      .where(inArray(users.id, userIds));

    const authorizedIds: string[] = [];
    for (const t of targets) {
      if (t.id === caller.id) continue; // cannot change own status
      if (caller.role === "superadmin") {
        authorizedIds.push(t.id);
        continue;
      }
      // admin: only users they created, and never other admins/superadmins
      if (t.role === "superadmin" || t.role === "admin") continue;
      if (t.createdBy && t.createdBy === caller.id) {
        authorizedIds.push(t.id);
      }
    }

    if (authorizedIds.length === 0) {
      return res.status(403).json({ success: false, message: "No users in your scope to update" });
    }

    const updated = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(inArray(users.id, authorizedIds))
      .returning({ id: users.id, status: users.status });

    res.status(200).json({
      success: true,
      message: `${updated.length} user(s) updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    console.error("Error bulk updating user status:", error);
    res.status(500).json({ success: false, message: "Error updating users" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(users).where(eq(users.id, id));
    if (!result.length) return res.status(404).json({ success: false, message: "User not found" });
    const { password, fcmToken, ...safeUser } = result[0];
    res.status(200).json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user", error });
  }
};




export const createUser = async (req: Request, res: Response) => {
  console.log("[createUser Controller] HIT!");
  try {
    const { username, password, email, firstName, lastName, avatar } = req.body;
    // This handler powers the public self-signup endpoint, so the caller's
    // role is never trusted from the request body. New self-signups are
    // always created as tenant `admin`. Use createUserSuperadmin for the
    // superadmin "create user" panel that needs to choose a role.
    const role = "admin";

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required.",
      });
    }

    // 1️⃣ Check if email exists
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUserByEmail.length > 0) {
      const user = existingUserByEmail[0];

      if (!user.isEmailVerified) {
        // Email unverified → allow updating username, password, etc.

        // Check if new username is taken by another account
        const usernameTaken = await db
          .select()
          .from(users)
          .where(and(
            eq(users.username, username),
            sql`${users.id} != ${user.id}` // exclude current user
          ));

        if (usernameTaken.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Username already exists.",
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update existing unverified user
        await db
          .update(users)
          .set({
            username,
            password: hashedPassword,
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            avatar: avatar || user.avatar,
            role: role || user.role,
          })
          .where(eq(users.id, user.id));

        // Remove old OTPs
        await db.delete(otpVerifications).where(eq(otpVerifications.userId, user.id));

        // Generate new OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        console.log(`Resending OTP for ${email}: ${otpCode} (expires at ${expiresAt.toISOString()})`);

        await db.insert(otpVerifications).values({
          userId: user.id,
          otpCode,
          expiresAt,
          isUsed: false,
        });

        await sendOTPEmailVerify(email, otpCode, firstName || user.firstName);

        return res.status(200).json({
          success: true, // ✅ treat OTP resend as success
          message: "Email already exists but not verified. OTP resent and account updated.",
        });
      } else {
        return res.status(409).json({
          success: false,
          message: "Email already exists.",
        });
      }
    }

    // 2️⃣ Check username for new accounts
    const existingUserByUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (existingUserByUsername.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    // 3️⃣ Create new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        role: role || "admin",
        avatar,
        permissions: defaultPermissions,
        isEmailVerified: false,
        status: "inactive",
      })
      .returning();

    const user = newUser[0];

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log(`Generated OTP for ${email}: ${otpCode} (expires at ${expiresAt.toISOString()})`);

    await db.insert(otpVerifications).values({
      userId: user.id,
      otpCode,
      expiresAt,
      isUsed: false,
    });

    await sendOTPEmailVerify(email, otpCode, firstName);

    return res.status(201).json({
      success: true,
      message: "User created. Verification OTP sent to email.",
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating user. Please try again.",
    });
  }
};




export const verifyEmailOTP = async (req: Request, res: Response) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    // User fetch
    const user = await db.select().from(users).where(eq(users.email, email));
    if (!user.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const userData = user[0];

    // OTP fetch
    const otpRecord = await db
      .select()
      .from(otpVerifications)
      .where(eq(otpVerifications.userId, userData.id))
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    if (!otpRecord.length) {
      return res.status(400).json({
        success: false,
        message: "No OTP found.",
      });
    }

    const otp = otpRecord[0];

    // Check OTP validity
    if (otp.isUsed) {
      return res.status(400).json({ success: false, message: "OTP already used." });
    }

    if (otp.otpCode !== otpCode) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    if (new Date() > otp.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired." });
    }

    // Mark OTP as used
    await db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, otp.id));

    // Mark user email verified and activate account
    const [activated] = await db
      .update(users)
      .set({
        isEmailVerified: true,
        status: "active",
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userData.id))
      .returning();

    if (!(req as any).session) {
      return res.status(500).json({ success: false, message: "Session not initialized" });
    }
    (req as any).session.user = {
      id: activated.id,
      username: activated.username,
      email: activated.email,
      firstName: activated.firstName,
      lastName: activated.lastName,
      role: activated.role,
      permissions: resolveUserPermissions(activated.role, activated.permissions as any),
      avatar: activated.avatar,
      createdBy: activated.createdBy || "",
    };

    return res.json({
      success: true,
      message: "Email verified successfully.",
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Server error.",
      error,
    });
  }
};



export const createUserOld = async (req: Request, res: Response) => {
  try {
    const { username, password, email, firstName, lastName, role, avatar, permissions } = req.body;

    // 🧱 Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required.",
      });
    }

    // 🔍 Check if username already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists. Please choose another one.",
      });
    }

    // 🔒 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 📝 Insert new user
    const newUser = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        role: role || "admin",
        avatar,
        permissions: defaultPermissions,
      })
      .returning();

    return res.status(201).json({
      success: true,
      data: newUser[0],
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating user",
      error,
    });
  }
};

// Fields a user may update on their own profile.
const USER_UPDATE_SELF_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "avatar",
  "phone",
] as const;

// Extra fields a tenant admin / superadmin may update on users within scope.
// NOTE: `role`, `status`, `tenantId`, `createdBy`, and `password` are
// intentionally NOT listed. Those are security-sensitive / tenant-boundary
// fields and must be changed only through their dedicated endpoints:
//   - role changes        → team routes (role-assignment endpoint)
//   - status changes      → updateUserStatus
//   - password changes    → team password endpoint / auth reset flow
//   - tenantId / createdBy → not user-mutable at all
const USER_UPDATE_ADMIN_EXTRA_FIELDS = [
  "username",
  "permissions",
  "isEmailVerified",
] as const;

type UserUpdatable = Partial<
  Pick<
    typeof users.$inferInsert,
    | "firstName"
    | "lastName"
    | "email"
    | "avatar"
    | "username"
    | "permissions"
    | "isEmailVerified"
  > & { phone?: string }
>;

function pickAllowed(
  input: Record<string, unknown>,
  allowed: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.user ?? (req as unknown as { session?: { user?: Express.Request["user"] } }).session?.user;

    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const isSelf = actor.id === id;
    const isSuperadmin = actor.role === "superadmin";
    const isAdmin = actor.role === "admin";

    if (!isSelf && !isSuperadmin && !isAdmin) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }

    // Tenant scoping: a tenant admin may only update users inside their own
    // tenant (users they created, or themselves). Superadmin is unscoped.
    if (!isSelf && isAdmin) {
      const [target] = await db.select().from(users).where(eq(users.id, id));
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      if (target.createdBy !== actor.id) {
        return res.status(403).json({
          success: false,
          message: "Cannot modify users outside your tenant",
        });
      }
    }

    const parsed = updateUserSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid update payload",
        errors: parsed.error.flatten(),
      });
    }

    const allowed =
      isSuperadmin || isAdmin
        ? [...USER_UPDATE_SELF_FIELDS, ...USER_UPDATE_ADMIN_EXTRA_FIELDS]
        : USER_UPDATE_SELF_FIELDS;

    const updates = pickAllowed(parsed.data, allowed) as UserUpdatable;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No updatable fields provided" });
    }

    const updated = await db.update(users).set(updates).where(eq(users.id, id)).returning();

    if (!updated.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating user", error });
  }
};


export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const caller = (req.session as any)?.user;
    if (!caller) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (caller.role !== "superadmin" && caller.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { id } = req.params;
    const parsed = updateUserStatusSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: active, inactive",
        errors: parsed.error.flatten(),
      });
    }
    const { status } = parsed.data;

    if (id === caller.id) {
      return res.status(400).json({ success: false, message: "Cannot change your own status" });
    }

    // Authority check: admins may only flip users in their own tenant and
    // must never touch other admins/superadmins. Superadmin is unrestricted.
    const [target] = await db
      .select({ id: users.id, createdBy: users.createdBy, role: users.role })
      .from(users)
      .where(eq(users.id, id));

    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (caller.role === "admin") {
      if (target.role === "superadmin" || target.role === "admin") {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
      if (!target.createdBy || target.createdBy !== caller.id) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
    }

    // Update status only
    const updated = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();

    // No user found
    if (!updated.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: updated[0],
    });

  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating status",
      error,
    });
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(users).where(eq(users.id, id));
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting user", error });
  }
};





// Add user for super admin

export const createUserSuperadmin = async (req: Request, res: Response) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and email are required.",
      });
    }

    // Check existing user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        role: "admin",
        permissions: defaultPermissions,
        isEmailVerified: true,
      })
      .returning();

    const user = newUser[0];


    return res.status(201).json({
      success: true,
      message: "User created.",
      data: { id: user.id, email },
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating user",
      error,
    });
  }
};
