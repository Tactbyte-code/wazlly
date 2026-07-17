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
import {
  createPanelConfig,
  getPanelConfigs,
  getPanelConfigById,
  updatePanelConfig,
  deletePanelConfig,
  getFirstPanelConfig,
  updateFirstPanelConfig,
} from "../services/panel.config";
import { z } from "zod";
import path from "path";
import fs from "fs";

export const panelConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().url().optional().or(z.literal("")),
  supportEmail: z.string().email().optional().or(z.literal("")),
  defaultLanguage: z.string().length(2).default("en"),
  supportedLanguages: z.array(z.string()).default(["en"]),
  currency: z.string().min(1).default("INR"), // e.g. USD, INR
  country: z.string().length(2).default("IN"), // ISO2 country code

});

export const brandSettingsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tagline: z.string().optional(),
  logo: z.string().optional(),
  logo2: z.string().optional(),
  favicon: z.string().optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  currency: z.string().min(1).optional(), // e.g. USD, INR
  country: z.string().length(2).optional(), // ISO2 country code
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  fontFamily: z.string().optional(),
  buttonColor: z.string().optional(),
  lightModeColor: z.string().optional(),
});

interface ParsedPanelConfig
  extends Partial<{
    name: string;
    description: string;
    tagline: string;
    defaultLanguage: string;
    supportedLanguages: string[];
    companyName: string;
    companyWebsite: string;
    supportEmail: string;
    logo: string;
    favicon: string;
    supportEmail: string;
    currency: string;
    country: string;
  }> {}

const resolveAssetUrl = (value: string | null | undefined): string => {
  if (!value) return "";
  if (value.startsWith("https://") || value.startsWith("/")) return value;
  return `/uploads/${value}`;
};

// Helper function to process base64 images
const processBase64Image = async (
  base64Data: string,
  type: "logo" | "favicon"
): Promise<string | null> => {
  if (!base64Data || !base64Data.includes("base64,")) {
    return base64Data; // Return as-is if not base64
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const data = matches[2];

    // Determine file extension
    let extension = "png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      extension = "jpg";
    } else if (mimeType.includes("svg")) {
      extension = "svg";
    } else if (mimeType.includes("icon") || type === "favicon") {
      extension = "ico";
    }

    // Create filename
    const filename = `${type}-${Date.now()}.${extension}`;
    const uploadPath = path.join(process.cwd(), "uploads", filename);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(uploadPath, data, "base64");

    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Error processing base64 image:", error);
    return null;
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const parsed = panelConfigSchema.parse(req.body);

    const files = req.files as
      | Record<string, (Express.Multer.File & { cloudUrl?: string })[]>
      | undefined;

    // ✅ Resolve logo and favicon paths
    const logoFile = files?.logo?.[0];
    const faviconFile = files?.favicon?.[0];

    const logoPath = logoFile
      ? logoFile.cloudUrl ||
        `/uploads/${path.basename(path.dirname(logoFile.path))}/${
          logoFile.filename
        }`
      : undefined;

    const faviconPath = faviconFile
      ? faviconFile.cloudUrl ||
        `/uploads/${path.basename(path.dirname(faviconFile.path))}/${
          faviconFile.filename
        }`
      : undefined;

    // ✅ Log the file type (Cloud / Local)
    if (logoFile)
      console.log(
        `🖼️ Logo: ${logoFile.cloudUrl ? "Cloud" : "Local"} → ${logoPath}`
      );
    if (faviconFile)
      console.log(
        `🌐 Favicon: ${
          faviconFile.cloudUrl ? "Cloud" : "Local"
        } → ${faviconPath}`
      );

    const data = {
      ...parsed,
      logo: logoPath,
      favicon: faviconPath,
    };

    const config = await createPanelConfig(data);
    res.status(201).json(config);
  } catch (err: any) {
    console.error("❌ Create Panel Config Error:", err);
    res.status(400).json({ error: err.errors || err.message });
  }
};

export const getAll = async (_req: Request, res: Response) => {
  try {
    const configs = await getPanelConfigs();
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const config = await getPanelConfigById(req.params.id);
    if (!config) return res.status(404).json({ message: "Not found" });
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const parsed: ParsedPanelConfig = panelConfigSchema
      .partial()
      .parse(req.body);
    const files = req.files as
      | Record<string, (Express.Multer.File & { cloudUrl?: string })[]>
      | undefined;

    // ✅ Resolve logo and favicon paths
    const logoFile = files?.logo?.[0];
    const faviconFile = files?.favicon?.[0];

    const logoPath = logoFile
      ? logoFile.cloudUrl ||
        `/uploads/${path.basename(path.dirname(logoFile.path))}/${
          logoFile.filename
        }`
      : parsed.logo;

    const faviconPath = faviconFile
      ? faviconFile.cloudUrl ||
        `/uploads/${path.basename(path.dirname(faviconFile.path))}/${
          faviconFile.filename
        }`
      : parsed.favicon;

    if (logoFile)
      console.log(
        `🖼️ Updating logo: ${
          logoFile.cloudUrl ? "Cloud" : "Local"
        } → ${logoPath}`
      );
    if (faviconFile)
      console.log(
        `🌐 Updating favicon: ${
          faviconFile.cloudUrl ? "Cloud" : "Local"
        } → ${faviconPath}`
      );

    const data: ParsedPanelConfig = {
      ...parsed,
      logo: logoPath,
      favicon: faviconPath,
    };

    const config = await updatePanelConfig(req.params.id, data);
    if (!config) return res.status(404).json({ message: "Not found" });

    res.json(config);
  } catch (err: any) {
    console.error("❌ Update Panel Config Error:", err);
    res.status(400).json({ error: err.errors || err.message });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await deletePanelConfig(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Brand Settings endpoints (for frontend compatibility)
export const getBrandSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getFirstPanelConfig();

    if (!config) {
      // Return default settings if no config exists
      return res.json({
        title: "Your App Name",
        tagline: "Building amazing experiences",
        logo: "",
        logo2:"",
        favicon: "",
        supportEmail: "",
        primaryColor: "",
        backgroundColor: "",
        fontFamily: "",
        buttonColor: "",
        lightModeColor: "",
        updatedAt: new Date().toISOString(),
      });
    }

    // Transform panel config to brand settings format
    const brandSettings = {
      title: config.name || "Your App Name",
      tagline: config.tagline || "",
      currency: config.currency || "",
      country: config.country || "",
      supportEmail: config.supportEmail || "",
      logo: resolveAssetUrl(config.logo),
      logo2: resolveAssetUrl(config.logo2),
      favicon: resolveAssetUrl(config.favicon),
      primaryColor: config.appearanceConfig?.primaryColor || "",
      backgroundColor: config.appearanceConfig?.backgroundColor || "",
      fontFamily: config.appearanceConfig?.fontFamily || "",
      buttonColor: config.appearanceConfig?.buttonColor || "",
      lightModeColor: config.appearanceConfig?.lightModeColor || "",
      updatedAt: config.updatedAt?.toISOString() || new Date().toISOString(),
    };

    res.json(brandSettings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createBrandSettings = async (req: Request, res: Response) => {
  try {
    // console.log("Creating Brand Settings with data:", req.body);
    const parsed = brandSettingsSchema.parse(req.body);

    const files = req.files as
      | Record<string, (Express.Multer.File & { cloudUrl?: string })[]>
      | undefined;

    let logoPath: string | undefined;
    let logo2Path: string | undefined;
    let faviconPath: string | undefined;

    // ✅ 1. Handle uploaded logo
    if (files?.logo?.[0]) {
      const logoFile = files.logo[0];
      const isCloudFile = !!logoFile.cloudUrl;
      logoPath =
        logoFile.cloudUrl ||
        `/uploads/${path.basename(path.dirname(logoFile.path))}/${
          logoFile.filename
        }`;
      console.log(`🖼️ Logo (${isCloudFile ? "Cloud" : "Local"}): ${logoPath}`);
    } else if (parsed.logo && parsed.logo.includes("base64,")) {
      // ✅ 2. Handle base64 fallback
      logoPath = (await processBase64Image(parsed.logo, "logo")) ?? undefined;
      console.log(`🖼️ Logo (Base64 processed): ${logoPath}`);
    }

    // ========== SECOND LOGO (logo2) ==========
    if (files?.logo2?.[0]) {
      const file = files.logo2[0];
      logo2Path =
        file.cloudUrl ||
        `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;
    } else if (parsed.logo2?.includes("base64,")) {
      logo2Path = await processBase64Image(parsed.logo2, "logo2");
    }


    // ✅ 3. Handle uploaded favicon
    if (files?.favicon?.[0]) {
      const faviconFile = files.favicon[0];
      const isCloudFile = !!faviconFile.cloudUrl;
      faviconPath =
        faviconFile.cloudUrl ||
        `/uploads/${path.basename(path.dirname(faviconFile.path))}/${
          faviconFile.filename
        }`;
      console.log(
        `🌐 Favicon (${isCloudFile ? "Cloud" : "Local"}): ${faviconPath}`
      );
    } else if (parsed.favicon && parsed.favicon.includes("base64,")) {
      faviconPath =
        (await processBase64Image(parsed.favicon, "favicon")) ?? undefined;
      console.log(`🌐 Favicon (Base64 processed): ${faviconPath}`);
    }

    // ✅ Transform brand settings to panel config format
    const panelData = {
      name: parsed.title,
      tagline: parsed.tagline || "",
      description: "",
      companyName: "",
      companyWebsite: "",
      supportEmail: "",
      defaultLanguage: "en",
      supportedLanguages: ["en"],
      logo: logoPath,
      logo2: logo2Path,
      favicon: faviconPath,
      country: "IN",
      currency: "INR",
      appearanceConfig: {
        primaryColor: parsed.primaryColor,
        backgroundColor: parsed.backgroundColor,
        fontFamily: parsed.fontFamily,
        buttonColor: parsed.buttonColor,
        lightModeColor: parsed.lightModeColor,
      }
    };

    const config = await createPanelConfig(panelData);

    const brandSettings = {
      title: config.name || parsed.title,
      tagline: config.tagline || "",
      logo: resolveAssetUrl(config.logo),
      logo2: resolveAssetUrl(config.logo2),
      favicon: resolveAssetUrl(config.favicon),
      country: config.country || "",
      currency: config.currency || "",
      supportEmail: config.supportEmail || "",
      primaryColor: config.appearanceConfig?.primaryColor || "",
      backgroundColor: config.appearanceConfig?.backgroundColor || "",
      fontFamily: config.appearanceConfig?.fontFamily || "",
      buttonColor: config.appearanceConfig?.buttonColor || "",
      lightModeColor: config.appearanceConfig?.lightModeColor || "",
      updatedAt: config.updatedAt?.toISOString() || new Date().toISOString(),
    };

    res.status(201).json(brandSettings);
  } catch (err: any) {
    console.error("❌ Create Brand Settings Error:", err);
    res.status(400).json({ error: err.errors || err.message });
  }
};

export const updateBrandSettingsOld = async (req: Request, res: Response) => {
  try {
    // console.log("Parsed Body:", req.body);
    // console.log("Parsed Files:", req.files);

    const parsed = brandSettingsSchema.partial().parse(req.body);
    const files = req.files as
      | Record<string, (Express.Multer.File & { cloudUrl?: string })[]>
      | undefined;

    let logoPath: string | undefined;
    let faviconPath: string | undefined;

    // ✅ 1. Handle logo
    if (files?.logo?.[0]) {
      const logoFile = files.logo[0];
      logoPath = logoFile.cloudUrl || `/uploads/${path.basename(path.dirname(logoFile.path))}/${logoFile.filename}`;
      console.log(`🖼️ Updated Logo: ${logoPath}`);
    } else if (parsed.logo && parsed.logo.includes("base64,")) {
      logoPath = await processBase64Image(parsed.logo, "logo");
    }

    // ✅ 2. Handle favicon
    if (files?.favicon?.[0]) {
      const faviconFile = files.favicon[0];
      faviconPath = faviconFile.cloudUrl || `/uploads/${path.basename(path.dirname(faviconFile.path))}/${faviconFile.filename}`;
      console.log(`🌐 Updated Favicon: ${faviconPath}`);
    } else if (parsed.favicon && parsed.favicon.includes("base64,")) {
      faviconPath = await processBase64Image(parsed.favicon, "favicon");
    }

    // ✅ 3. Don't strip cloud URLs anymore
    const panelData = {
      name: parsed.title,
      tagline: parsed.tagline || "",
      logo: logoPath,
      favicon: faviconPath,
      country: parsed.country || "",
      supportEmail: parsed.supportEmail || "",
      currency: parsed.currency || "",
    };

    const config = await updateFirstPanelConfig(panelData);

    const brandSettings = {
      title: config.name || parsed.title,
      tagline: config.tagline || "",
      country: config.country || "",
      currency: config.currency || "",
      supportEmail: config.supportEmail || "",
      logo: resolveAssetUrl(config.logo),
      favicon: resolveAssetUrl(config.favicon),
      updatedAt: config.updatedAt?.toISOString() || new Date().toISOString(),
    };

    res.json(brandSettings);
  } catch (err: any) {
    console.error("❌ Update Brand Settings Error:", err);
    res.status(400).json({ error: err.errors || err.message });
  }
};



export const updateBrandSettings = async (req: Request, res: Response) => {
  try {
    const parsed = brandSettingsSchema.partial().parse(req.body);

    const files = req.files as
      | Record<string, (Express.Multer.File & { cloudUrl?: string })[]>
      | undefined;

    let logoPath: string | undefined;
    let logo2Path: string | undefined; // 👈 ADDED
    let faviconPath: string | undefined;

    // =============================
    // ✅ 1. MAIN LOGO (logo)
    // =============================
    if (files?.logo?.[0]) {
      const logoFile = files.logo[0];
      logoPath = logoFile.cloudUrl || `/uploads/${path.basename(path.dirname(logoFile.path))}/${logoFile.filename}`;
      console.log(`🖼️ Updated Logo: ${logoPath}`);
    } else if (parsed.logo && parsed.logo.includes("base64,")) {
      logoPath = await processBase64Image(parsed.logo, "logo");
    }

    // =============================
    // ✅ 2. SECONDARY LOGO (logo2)
    // =============================
    if (files?.logo2?.[0]) {
      const logo2File = files.logo2[0];
      logo2Path = logo2File.cloudUrl || `/uploads/${path.basename(path.dirname(logo2File.path))}/${logo2File.filename}`;
      console.log(`🖼️ Updated Secondary Logo: ${logo2Path}`);
    } else if (parsed.logo2 && parsed.logo2.includes("base64,")) {
      logo2Path = await processBase64Image(parsed.logo2, "logo2");
    }

    // =============================
    // ✅ 3. FAVICON
    // =============================
    if (files?.favicon?.[0]) {
      const faviconFile = files.favicon[0];
      faviconPath = faviconFile.cloudUrl || `/uploads/${path.basename(path.dirname(faviconFile.path))}/${faviconFile.filename}`;
      console.log(`🌐 Updated Favicon: ${faviconPath}`);
    } else if (parsed.favicon && parsed.favicon.includes("base64,")) {
      faviconPath = await processBase64Image(parsed.favicon, "favicon");
    }

    // =============================
    // ✅ 4. Panel Config Update
    // =============================
    const existingConfig = await getFirstPanelConfig();
    const currentAppearance = existingConfig?.appearanceConfig || {};

    const panelData = {
      name: parsed.title,
      tagline: parsed.tagline,
      logo: logoPath,
      logo2: logo2Path,
      favicon: faviconPath,
      country: parsed.country,
      supportEmail: parsed.supportEmail,
      currency: parsed.currency,
      appearanceConfig: {
        ...currentAppearance,
        ...(parsed.primaryColor !== undefined && { primaryColor: parsed.primaryColor }),
        ...(parsed.backgroundColor !== undefined && { backgroundColor: parsed.backgroundColor }),
        ...(parsed.fontFamily !== undefined && { fontFamily: parsed.fontFamily }),
        ...(parsed.buttonColor !== undefined && { buttonColor: parsed.buttonColor }),
        ...(parsed.lightModeColor !== undefined && { lightModeColor: parsed.lightModeColor }),
      }
    };

    const config = await updateFirstPanelConfig(panelData);

    // =============================
    // ✅ 5. Response (Frontend format)
    // =============================
    const brandSettings = {
      title: config.name || parsed.title,
      tagline: config.tagline || "",
      country: config.country || "",
      currency: config.currency || "",
      supportEmail: config.supportEmail || "",
      logo: resolveAssetUrl(config.logo),
      logo2: resolveAssetUrl(config.logo2),
      favicon: resolveAssetUrl(config.favicon),
      primaryColor: config.appearanceConfig?.primaryColor || "",
      backgroundColor: config.appearanceConfig?.backgroundColor || "",
      fontFamily: config.appearanceConfig?.fontFamily || "",
      buttonColor: config.appearanceConfig?.buttonColor || "",
      lightModeColor: config.appearanceConfig?.lightModeColor || "",
      updatedAt: config.updatedAt?.toISOString() || new Date().toISOString(),
    };

    res.json(brandSettings);
  } catch (err: any) {
     console.error("❌ FULL BRAND SETTINGS ERROR:", err);
  console.error("❌ STACK:", err?.stack);
  console.error("❌ CAUSE:", err?.cause);
    console.error("❌ Update Brand Settings Error:", err);
    res.status(400).json({ error: err.errors || err.message });
  }
};

