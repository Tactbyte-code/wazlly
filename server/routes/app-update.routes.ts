import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import * as appUpdateController from "../controllers/app-update.controller";

function getTempDir(): string {
  return path.join(process.env.APP_UPDATE_ROOT || process.cwd(), ".update-temp");
}

const updateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = getTempDir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `update-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const updateUpload = multer({
  storage: updateStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files are accepted"));
    }
  },
});

export function registerAppUpdateRoutes(app: Express) {
  app.get(
    "/api/app-update/status",
    requireAuth,
    requireRole("superadmin"),
    appUpdateController.getStatus
  );

  // Wrap multer.single so any multer/fileFilter error (e.g. non-.zip)
  // returns a deterministic 400 to the client instead of falling through
  // to the generic express error handler as a 500.
  const handleZipUpload = (req: Request, res: Response, next: NextFunction) => {
    updateUpload.single("zipFile")(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Upload rejected" });
      }
      next();
    });
  };

  app.post(
    "/api/app-update/upload",
    requireAuth,
    requireRole("superadmin"),
    handleZipUpload,
    appUpdateController.uploadZip
  );

  app.post(
    "/api/app-update/execute",
    requireAuth,
    requireRole("superadmin"),
    appUpdateController.executeUpdate
  );

  app.get(
    "/api/app-update/runs",
    requireAuth,
    requireRole("superadmin"),
    appUpdateController.listRuns
  );

  app.get(
    "/api/app-update/runs/latest",
    requireAuth,
    requireRole("superadmin"),
    appUpdateController.getLatestRun
  );

  app.get(
    "/api/app-update/runs/:id",
    requireAuth,
    requireRole("superadmin"),
    appUpdateController.getRunById
  );

  app.post(
    "/api/app-update/rollback",
    requireAuth,
    requireRole("superadmin"),
    appUpdateController.manualRollback
  );
}
