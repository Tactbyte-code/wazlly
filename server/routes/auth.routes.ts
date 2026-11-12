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

import { Request, Response, Router } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { db } from "../db";
import { users, userActivityLogs } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import { resolveUserPermissions } from "server/utils/role-permissions";
import country from "../config/country.json";
import { sendOTPEmail } from "../services/email.service";
import { otpVerifications } from "@shared/schema";
import { createUser } from "../controllers/user.controller";
import { randomInt } from "crypto";

const router = Router();

// Public self-signup. Delegates to the shared createUser controller, which
// forces role="admin" regardless of the request body. CSRF middleware
// already whitelists this path. Mirrors the previous (auth-protected)
// /api/users/create handler so an unauthenticated visitor can register.
router.post("/signup", createUser);

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Login endpoint
router.post("/login", validateRequest(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    // console.log("Login request body:", req.body);

    // Find user by username
    const results = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    // Do not log the raw users[] result — rows contain password hashes,
    // fcmToken, and other secrets/PII.

    const user = results[0];

    if (!user) {
      // Do not echo the supplied username in logs — treat as sensitive.
      console.warn("[auth] login attempt failed: user not found");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // console.log(user.status, "checkk users statuuuuuu")

    // Check if user is active
    if ((user.status || "").trim().toLowerCase() !== "active") {
      return res
        .status(403)
        .json({ error: "Account is inactive. Please contact administrator." });
    }

    // Check if email is verified
    if (user.isEmailVerified === false) {
      return res
        .status(403)
        .json({ error: "Email not verified. Please verify your email first." });
    }

    // Ensure password field exists
    if (!user.password) {
      console.error("User has no password in DB:", user.id);
      return res
        .status(500)
        .json({ error: "User record is invalid. Contact support." });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Update last login
    await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Log activity
    try {
      await db.insert(userActivityLogs).values({
        userId: user.id,
        action: "login",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        }),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (logError) {
      console.error("Failed to log login activity:", logError);
    }

    // Store user in session
    if (!(req as any).session) {
      console.error("Session not initialized");
      return res.status(500).json({ error: "Session not initialized" });
    }

    (req as any).session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: resolveUserPermissions(user.role, user.permissions as any),
      avatar: user.avatar,
      createdBy: user.createdBy || "",
    };

    // Remove password before sending back
    const { password: _, ...userData } = user;

    res.json({
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    console.log("Error during login:", error);
    res
      .status(500)
      .json({ error: "Login failed", message: (error as Error).message });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  const userId = (req as any).session?.user?.id;

  if (userId) {
    // Log activity
    db.insert(userActivityLogs)
      .values({
        userId,
        action: "logout",
        entityType: "user",
        entityId: userId,
        details: {},
      })
      .catch(console.error);
  }

  // Destroy session
  (req as any).session.destroy((err: any) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ error: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logout successful" });
  });
});

// Get current user
router.get("/me", async (req, res) => {
  // console.log("Fetching current user" , req.session);
  const user = (req as any).session?.user;
  // console.log("Session user:", user);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Get fresh user data
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id));

  if (!currentUser) {
    return res.status(404).json({ error: "User not found" });
  }

  // Remove password from response
  const { password, ...userData } = currentUser;
  res.json(userData);
});

// Check if authenticated (for frontend)
router.get("/check", (req, res) => {
  const user = (req as any).session?.user;
  res.json({ authenticated: !!user, user });
});

router.get("/country-data", (req, res) => {
  res.json(country);
});

// forgot password
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // STEP 1: Check whether the user exists.
    const existingUser = await db
      .select()
      .from(users)
      .where(sql`LOWER(TRIM(${users.email})) = ${email}`)
      .limit(1);

    if (!existingUser.length) {
      return res.status(404).json({
        error: "Email not registered",
      });
    }

    const user = existingUser[0];
    const userId = user.id;
    const userName = user.firstName;

    // STEP 2: Rate limiting - maximum 3 OTPs in 5 minutes.
    const recentOTPs = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          sql`${otpVerifications.createdAt} > NOW() - INTERVAL '5 minutes'`,
        ),
      );

    if (recentOTPs.length >= 3) {
      return res.status(429).json({
        error: "Too many requests. Try again in 5 minutes.",
      });
    }

    // STEP 3: Generate a cryptographically secure 6-digit OTP.
    const otpCode = randomInt(100000, 1000000).toString();

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // STEP 4: Store OTP.
    await db.insert(otpVerifications).values({
      userId,
      otpCode,
      expiresAt,
      isUsed: false,
    });

    // STEP 5: Send email.
    try {
      const emailResult = await sendOTPEmail(email, otpCode, userName);

      console.log(
        `[Forgot Password] OTP email accepted by SMTP. User ID: ${userId}, Message ID: ${emailResult.messageId}`,
      );

      return res.status(200).json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (emailError: any) {
      console.error("[Forgot Password] OTP delivery failed:", emailError);

      await db
        .update(otpVerifications)
        .set({ isUsed: true })
        .where(
          and(
            eq(otpVerifications.userId, userId),
            eq(otpVerifications.otpCode, otpCode),
          ),
        );

      return res.status(502).json({
        success: false,
        error: "Unable to send verification email. Please try again later.",
      });
    }
  } catch (error: any) {
    console.error("[Forgot Password] Controller error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to process password reset request",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ error: "Email and new password are required" });
    }

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser.length) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const userId = existingUser[0].id;

    // Find valid OTP
    const otpRecord = await db
      .select()
      .from(otpVerifications)
      .where(
        eq(otpVerifications.userId, userId),
        eq(otpVerifications.isUsed, false),
      )
      .limit(1);

    if (!otpRecord.length) {
      return res.status(400).json({ error: "Invalid or already used OTP" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    // Delete the OTP record after successful password reset
    await db
      .delete(otpVerifications)
      .where(eq(otpVerifications.id, otpRecord[0].id));

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to reset password" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    // Do not log req.body — it carries the OTP code and email.

    if (!email || !otpCode) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Do not log the full user row — contains password hash and PII.

    if (!existingUser.length) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const userId = existingUser[0].id;

    // Find valid OTP
    const otpRecord = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.otpCode, otpCode.toString()),
          eq(otpVerifications.isUsed, false),
          // sql`${otpVerifications.expiresAt} > timezone('UTC', now())`
        ),
      )
      .limit(1);

    // Do not log OTP records — they contain the OTP code itself.

    if (!otpRecord.length) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP valid => mark as used
    await db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, otpRecord[0].id));

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: error.message || "Failed to verify OTP" });
  }
});

setInterval(
  async () => {
    try {
      await db
        .delete(otpVerifications)
        .where(sql`${otpVerifications.expiresAt} < timezone('UTC', now())`);
    } catch (error) {
      console.error("[OTP Cleanup] Error:", error);
    }
  },
  5 * 60 * 1000,
);

export default router;
