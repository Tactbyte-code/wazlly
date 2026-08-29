import { S3Client } from "@aws-sdk/client-s3";
import { storageSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "server/db";

const CACHE_TTL_MS = 600_000;
const CACHE_KEY = "do_client";

type S3ClientResult = {
  s3: S3Client;
  bucket: string;
  endpoint: string;
  region: string;
} | null;

type CacheEntry = {
  value: S3ClientResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export const invalidateDOClientCache = (): void => {
  cache.delete(CACHE_KEY);
};

export const createDOClient = async (): Promise<S3ClientResult> => {
  const now = Date.now();
  const entry = cache.get(CACHE_KEY);

  if (entry !== undefined && now < entry.expiresAt) {
    return entry.value;
  }

  try {
    console.log("🔍 Fetching storage settings from database...");

    const settings = await db
      .select()
      .from(storageSettings)
      .where(eq(storageSettings.isActive, true))
      .limit(1);

    if (!settings || settings.length === 0) {
      console.log("⚠️ No active storage settings found in database");
      cache.set(CACHE_KEY, { value: null, expiresAt: now + CACHE_TTL_MS });
      return null;
    }

    const config = settings[0];
    const isAws = config.provider === "aws";

    let cleanEndpoint = "";

    if (!isAws) {
      if (!config.endpoint) {
        console.log("⚠️ Non-AWS provider selected but no endpoint configured");
        cache.set(CACHE_KEY, { value: null, expiresAt: now + CACHE_TTL_MS });
        return null;
      }

      cleanEndpoint = config.endpoint.trim().replace(/\/$/, "");

      const urlParts = new URL(cleanEndpoint);
      const hostParts = urlParts.host.split(".");

      if (hostParts.length > 3) {
        hostParts.shift();
        urlParts.host = hostParts.join(".");
        cleanEndpoint = urlParts.toString();
      }
    };

    console.log("✅ Active storage settings found:");
    console.log(`   Provider: ${config.provider}`);
    console.log(`   Space Name: ${config.spaceName}`);
    console.log(`   Region: ${config.region}`);
    console.log(`   Is Active: ${config.isActive}`);

    const s3Client = new S3Client({
      endpoint: isAws ? undefined : cleanEndpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: false,
    });

    console.log("✅ S3 Client created successfully");

    const result: S3ClientResult = {
      s3: s3Client,
      bucket: config.spaceName,
      endpoint: isAws
        ? `https://s3.${config.region}.amazonaws.com`
        : cleanEndpoint,
      region: config.region,
    };

    cache.set(CACHE_KEY, { value: result, expiresAt: now + CACHE_TTL_MS });
    return result;
  } catch (error) {
    console.error("❌ Error creating DO client:", error);
    cache.set(CACHE_KEY, { value: null, expiresAt: now + CACHE_TTL_MS });
    return null;
  }
};
