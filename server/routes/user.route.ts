import { requireAuth, requireRole } from "server/middlewares/auth.middleware";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  bulkUpdateUserStatus,
  verifyEmailOTP,
  createUserSuperadmin,
  exportAllUsers
} from "../controllers/user.controller";
import type { Express } from "express";

export function userRoutes(app: Express) {
app.get("/api/admin/users/export", requireAuth, exportAllUsers);
app.get("/api/admin/users", requireAuth, getAllUsers);
app.get("/api/admin/users/:id", requireAuth, getUserById);
// Public self-signup is served by POST /api/auth/signup (auth.routes.ts).
// The superadmin "create user" panel uses createUserSuperadmin below.
// /api/users/create is preserved as a superadmin-only alias for
// backwards compatibility with older API clients.
app.post("/api/admin/users/create", requireAuth, requireRole("superadmin"), createUserSuperadmin);
app.post("/api/users/create", createUserSuperadmin);
app.post("/api/users/verifyEmail", verifyEmailOTP);
app.put("/api/admin/users/bulk-status", requireAuth, bulkUpdateUserStatus);
app.put("/api/users/:id", requireAuth, updateUser);
app.put("/api/user/status/:id", requireAuth, updateUserStatus);
app.delete("/api/admin/users/:id", requireAuth, deleteUser);
}
