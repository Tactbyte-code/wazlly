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

import multer, { FileFilterCallback } from "multer";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { createDOClient } from "../config/digitalOceanConfig";
import { PutObjectCommand } from "@aws-sdk/client-s3";



const allowedTypes = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg", "image/avif",
  "image/x-icon", "image/vnd.microsoft.icon",
  "video/mp4", "video/webm", "video/ogg", "video/x-msvideo", "video/quicktime",
  "video/3gpp",
  "audio/mp3", "audio/wav", "audio/ogg", "audio/mpeg", "audio/m4a",
  "audio/aac", "audio/mp4", "audio/x-m4a", "audio/opus",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

// Extend Express.Multer.File to include cloudUrl
declare global {
  namespace Express {
    interface Multer {
      File: {
        cloudUrl?: string;
      };
    }
  }
}

// Helper function to ensure directory exists
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Local storage setup with user-specific folders
const localStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as any).user?.id || (req.body?.userId) || "guest";
    const uploadPath = path.join("uploads", userId.toString());
    
    ensureDirectoryExists(uploadPath);
    console.log(`📁 Saving file to local directory: ${uploadPath}`);
    
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log(`📝 Generated filename: ${uniqueName}`);
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (
  req: Request & { fileFilterError?: string },
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) {
    console.log(`✅ File type accepted: ${file.mimetype}`);
    cb(null, true);
  } else {
    console.log(`❌ File type rejected: ${file.mimetype}`);
    req.fileFilterError = `Unsupported file type: ${file.mimetype}`;
    cb(null, false);
  }
};

// Multer instance
export const upload = multer({
  storage: localStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (documents can be up to 100MB per WhatsApp)
  fileFilter,
});

// ---------------------------------------------------------------------------
// Magic-byte sniffer
// Inspects the actual file bytes to confirm the declared MIME type matches
// the on-disk content. Defends against renamed/spoofed files (e.g. an .exe
// uploaded with `image/png` mime). Covers the categories permitted by
// `allowedTypes`: image/pdf/video/audio. For office docs / text we fall
// back to the multer mime check (no reliable single-prefix signature).
// ---------------------------------------------------------------------------
type DetectedKind =
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "ico"
  | "avif"
  | "pdf"
  | "mp3"
  | "wav"
  | "ogg"
  | "mp4"
  | "webm"
  | "avi"
  | "quicktime"
  | "3gpp"
  | "office-zip" // docx / xlsx / pptx (zip container)
  | "office-cfb" // legacy doc / xls / ppt
  | "text"
  | "unknown";

const KIND_TO_MIMES: Record<DetectedKind, string[]> = {
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  ico: ["image/x-icon", "image/vnd.microsoft.icon"],
  avif: ["image/avif"],
  pdf: ["application/pdf"],
  mp3: ["audio/mp3", "audio/mpeg"],
  wav: ["audio/wav"],
  ogg: ["audio/ogg", "video/ogg", "audio/opus"],
  mp4: ["video/mp4", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac"],
  webm: ["video/webm"],
  avi: ["video/x-msvideo"],
  quicktime: ["video/quicktime"],
  "3gpp": ["video/3gpp"],
  "office-zip": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  "office-cfb": [
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
  ],
  // Text-family MIMEs: magic-byte detection cannot reliably distinguish
  // CSV/Markdown/etc. from plain text, so accept any declared text/* MIME
  // that the multer fileFilter has already approved.
  text: [
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/x-markdown",
    "text/html",
    "text/xml",
    "application/json",
    "application/xml",
    "application/csv",
  ],
  unknown: [],
};

function detectKindFromMagic(buf: Buffer): DetectedKind {
  if (buf.length < 4) return "unknown";

  // Images
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) return "png";
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return "gif";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) return "webp";
  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return "ico";

  // PDF
  if (buf.toString("ascii", 0, 4) === "%PDF") return "pdf";

  // ID3-tagged MP3
  if (buf.toString("ascii", 0, 3) === "ID3") return "mp3";
  // Frame-sync MP3 (rough)
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "mp3";
  // RIFF / WAVE
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  ) return "wav";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "AVI "
  ) return "avi";
  // OGG
  if (buf.toString("ascii", 0, 4) === "OggS") return "ogg";
  // WebM / Matroska — EBML header
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  // ISO base media (mp4, m4a, 3gp, mov, avif): bytes 4..7 == "ftyp"
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("qt")) return "quicktime";
    if (brand.startsWith("3g")) return "3gpp";
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
    return "mp4";
  }

  // Office Open XML containers (zip)
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    return "office-zip";
  }
  // Legacy Office (CFB): D0 CF 11 E0 A1 B1 1A E1
  if (
    buf.length >= 8 &&
    buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0 &&
    buf[4] === 0xa1 && buf[5] === 0xb1 && buf[6] === 0x1a && buf[7] === 0xe1
  ) return "office-cfb";

  // Plain text — must be valid UTF-8-ish (no NUL in first 512 bytes)
  const slice = buf.subarray(0, Math.min(buf.length, 512));
  if (!slice.includes(0)) return "text";

  return "unknown";
}

/**
 * Throws when the file's actual bytes don't match its declared MIME.
 * Returns silently when the file is acceptable. Accepts either an on-disk
 * path or an in-memory Buffer (for multer.memoryStorage uploads).
 */
export function assertFileMatchesMime(
  source: string | Buffer,
  declaredMime: string
): void {
  let slice: Buffer;
  let fd: number | null = null;
  try {
    if (Buffer.isBuffer(source)) {
      slice = source.subarray(0, Math.min(source.length, 4096));
    } else {
      fd = fs.openSync(source, "r");
      const head = Buffer.alloc(4096);
      const bytes = fs.readSync(fd, head, 0, head.length, 0);
      slice = head.subarray(0, bytes);
    }
    const kind = detectKindFromMagic(slice);

    // Skip strict checks for kinds we can't detect reliably from a few bytes
    // (text files, where multer's mime is the best we have).
    if (kind === "unknown") {
      // Only office/text mimes are allowed to fall through without a
      // recognised signature; everything else must match.
      const looselyAllowed = [
        "text/plain",
        "application/msword",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (!looselyAllowed.includes(declaredMime)) {
        throw new Error(
          `File contents do not match declared type "${declaredMime}" (no recognised signature)`
        );
      }
      return;
    }

    const expectedMimes = KIND_TO_MIMES[kind] || [];
    if (!expectedMimes.includes(declaredMime)) {
      throw new Error(
        `File contents (detected: ${kind}) do not match declared MIME type "${declaredMime}"`
      );
    }
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* ignore */ }
    }
  }
}

/**
 * Express middleware: validates magic bytes for every file produced by
 * multer in the current request. Rejects (and unlinks) any spoofed file.
 */
export const validateUploadedFiles = (
  req: Request & { fileFilterError?: string },
  res: Response,
  next: NextFunction
): void => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) files.push(...req.files);
    else for (const v of Object.values(req.files)) files.push(...(v as Express.Multer.File[]));
  }

  for (const file of files) {
    try {
      // Prefer in-memory buffer when available (memoryStorage); otherwise
      // read from the on-disk path written by diskStorage.
      const source: string | Buffer = file.buffer ?? file.path;
      assertFileMatchesMime(source, file.mimetype);
    } catch (err) {
      console.error(`[Upload] Magic-byte validation failed for ${file.originalname}:`, (err as Error).message);
      // Remove the unsafe file from disk before returning (no-op for buffers).
      if (file.path) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      }
      res.status(415).json({
        error: "Unsupported or spoofed file content",
        details: (err as Error).message,
        file: file.originalname,
      });
      return;
    }
  }

  next();
};

// Middleware to upload to DigitalOcean Spaces (if active)
export const handleDigitalOceanUpload = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("\n🔍 Checking DigitalOcean Spaces configuration...");
    
    // Check if DO is active
    const doClient = await createDOClient();

    // console.log('doClient:', doClient);
    
    console.log("📊 DO Client Status:", doClient ? "✅ Active" : "❌ Inactive");
    
    // Handle both single file and multiple files
    let files: Express.Multer.File[] = [];
    
    if (req.file) {
      // Single file upload (upload.single())
      files = [req.file];
      console.log("📦 Processing 1 file (single upload)");
    } else if (req.files) {
      // Multiple files upload (upload.array() or upload.fields())
      if (Array.isArray(req.files)) {
        files = req.files;
        console.log(`📦 Processing ${files.length} file(s) (array upload)`);
      } else {
        // upload.fields() returns an object
        files = Object.values(req.files).flat();
        console.log(`📦 Processing ${files.length} file(s) (fields upload)`);
      }
    }

    if (files.length === 0) {
      console.log("⚠️ No files to process");
      return next();
    }

    // ── Magic-byte validation: reject any file whose actual bytes do not
    // match its declared MIME (defends against renamed/spoofed uploads).
    for (const file of files) {
      try {
        assertFileMatchesMime(file.path, file.mimetype);
      } catch (err) {
        console.error(
          `[Upload] Magic-byte validation failed for ${file.originalname}:`,
          (err as Error).message
        );
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        _res.status(415).json({
          error: "Unsupported or spoofed file content",
          details: (err as Error).message,
          file: file.originalname,
        });
        return;
      }
    }

    // If DO is not active, keep files local — cloudUrl intentionally left unset
    // so the controller's fallback builds the correct /uploads/userId/filename path
    if (!doClient) {
      console.log("💾 DigitalOcean not configured/active, files saved locally");
      files.forEach(file => {
        console.log(`   📍 Local path: ${file.path}`);
        console.log(`   🌐 Access URL: /uploads/${path.basename(path.dirname(file.path))}/${file.filename}`);
      });
      return next();
    }

    const { s3, bucket, endpoint } = doClient;
    console.log(`☁️ Uploading to DigitalOcean Spaces: ${bucket}`);

    // Upload to DigitalOcean Spaces
    for (const file of files) {
      try {
        console.log(`\n📤 Uploading: ${file.originalname}`);
        console.log(`   Local path: ${file.path}`);
        
        // Check if file exists
        if (!fs.existsSync(file.path)) {
          console.error(`   ❌ File not found: ${file.path}`);
          continue;
        }
        
        // Read file buffer
        const fileBuffer = fs.readFileSync(file.path);
        const { conversationId } = req.params;
        console.log(`   File read successfully: ${file.path} , conversationId: ${conversationId}`);
        const userId = (req as any).user?.id || (req.body?.userId) || conversationId || "guest";
        const fileKey = `uploads/${userId}/${Date.now()}-${path.basename(file.originalname)}`;

        console.log(`   Cloud key: ${fileKey}`);
        console.log(`   File size: ${fileBuffer.length} bytes`);

        // Upload to DO Spaces
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket!,
            Key: fileKey,
            Body: fileBuffer,
            ACL: "public-read",
            ContentType: file.mimetype,
          })
        );

        // Construct cloud URL
        const endpointUrl = new URL(endpoint || "");
        // console.log('endpointUrl:', endpointUrl);
        file.cloudUrl = `https://${bucket}.${endpointUrl.host}/${fileKey}`;

        console.log(`   ✅ Upload successful!`);
        console.log(`   🌐 Cloud URL: ${file.cloudUrl}`);

        // Delete local file after successful upload
        // fs.unlinkSync(file.path);
        // console.log(`   🗑️ Local file deleted`);
        
      } catch (uploadError) {
        console.error(`   ❌ Upload failed for ${file.originalname}:`, uploadError);
        console.log(`   💾 Keeping local file: ${file.path}`);
        // Keep the local file if upload fails
      }
    }

    next();
  } catch (error) {
    console.error("❌ DigitalOcean Upload Middleware Error:", error);
    console.log("💾 Falling back to local storage");
    // Fallback to local storage on error
    next();
  }
};

// Initialize uploads directory on app start
export const initializeUploadsDirectory = (): void => {
  ensureDirectoryExists("uploads");
  console.log("✅ Uploads directory initialized");
};