import OpenAI from "openai";
import { chromium } from "playwright";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  trainingSources,
  trainingChunks,
  trainingQaPairs,
  aiSettings,
} from "@shared/schema";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

const SARVAM_BASE_URL = "https://api.sarvam.ai/v2";
const SARVAM_EMBEDDING_MODEL = "embeddinggemma-2";
const SARVAM_EMBEDDING_DIMENSIONS = 768;

/**
 * Creates a Sarvam API client using the OpenAI-compatible SDK.
 *
 * The OpenAI SDK is only being used as an HTTP client.
 * All AI requests are sent to Sarvam.
 */
function getAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: SARVAM_BASE_URL,
  });
}

/**
 * Gets the active Sarvam client configured for a channel.
 *
 * This same client is used for:
 * - Chat completions
 * - Document embeddings
 * - FAQ embeddings
 * - Search query embeddings
 */
async function getChannelAIClient(
  channelId: string,
): Promise<OpenAI | null> {
  const [setting] = await db
    .select()
    .from(aiSettings)
    .where(
      and(
        eq(aiSettings.channelId, channelId),
        eq(aiSettings.isActive, true),
      ),
    )
    .limit(1);

  if (!setting?.apiKey) {
    return null;
  }

  if (setting.provider !== "sarvam") {
    throw new Error(
      `Unsupported AI provider "${setting.provider}". Only Sarvam is supported.`,
    );
  }

  return getAIClient(setting.apiKey);
}

/**
 * Generates embeddings using Sarvam EmbeddingGemma 2.
 *
 * Document prefix:
 * title: none | text: ...
 *
 * Search query prefix:
 * task: search result | query: ...
 */
async function generateEmbedding(
  client: OpenAI,
  text: string,
  type: "document" | "query",
): Promise<number[]> {
  const input =
    type === "query"
      ? `task: search result | query: ${text}`
      : `title: none | text: ${text}`;

  const response = await client.embeddings.create({
    model: SARVAM_EMBEDDING_MODEL,
    input: input.substring(0, 8000),
  });

  const embedding = response.data[0]?.embedding;

  if (
    !embedding ||
    embedding.length !== SARVAM_EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Invalid Sarvam embedding. Expected ${SARVAM_EMBEDDING_DIMENSIONS} dimensions.`,
    );
  }

  return embedding;
}

function splitTextIntoChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");

    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }

    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Returns -1 for incompatible vectors so old embeddings
 * cannot accidentally participate in similarity ranking.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (
    a.length !== SARVAM_EMBEDDING_DIMENSIONS ||
    b.length !== SARVAM_EMBEDDING_DIMENSIONS ||
    a.length !== b.length
  ) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return -1;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Scrapes a URL using Playwright.
 * Supports JavaScript-rendered websites.
 */
export async function scrapeUrl(url: string): Promise<string> {
  let browser;

  try {
    console.log("[Playwright] Starting:", url);

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: {
        width: 1366,
        height: 768,
      },
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    if (response && !response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${url}`);
    }

    // Allow JavaScript-rendered content to finish loading.
    // Some websites never become fully idle, so this has a timeout.
    await page
      .waitForLoadState("networkidle", {
        timeout: 8000,
      })
      .catch(() => {});

    await page.locator("body").waitFor({
      state: "visible",
      timeout: 10000,
    });

    console.log("[Playwright] Page title:", await page.title());

    // Remove elements that generally don't contain useful training content.
    await page.evaluate(() => {
      document
        .querySelectorAll(
          "script, style, nav, footer, header, aside, noscript, iframe, svg",
        )
        .forEach((element) => element.remove());
    });

    const selectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      ".main-content",
      "#content",
      "#main",
    ];

    let mainContent = "";

    for (const selector of selectors) {
      const locator = page.locator(selector).first();

      if (await locator.count()) {
        const text = (await locator.innerText().catch(() => ""))
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 100) {
          mainContent = text;
          break;
        }
      }
    }

    // Fallback: extract all visible body text.
    if (mainContent.length < 50) {
      mainContent = (await page.locator("body").innerText())
        .replace(/\s+/g, " ")
        .trim();
    }

    const title = await page.title();

    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute("content")
      .catch(() => "");

    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute("content")
      .catch(() => "");

    let finalContent = mainContent;

    if (
      finalContent.length < 50 &&
      (title || metaDescription || ogDescription)
    ) {
      finalContent = [title, metaDescription, ogDescription, finalContent]
        .filter(Boolean)
        .join(". ");
    }

    console.log(
      "[Playwright] Extracted content length:",
      finalContent.length,
    );

    console.log(
      "[Playwright] Extracted content preview:",
      finalContent.substring(0, 1000),
    );

    return finalContent;
  } catch (error) {
    console.error("[Playwright] Scraping failed:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Processes a training source:
 * 1. Extracts content.
 * 2. Splits content into chunks.
 * 3. Generates Sarvam embeddings.
 * 4. Saves chunks and embeddings.
 */
export async function processTrainingSource(
  sourceId: string,
): Promise<void> {
  const [source] = await db
    .select()
    .from(trainingSources)
    .where(eq(trainingSources.id, sourceId));

  if (!source) {
    throw new Error("Source not found");
  }

  await db
    .update(trainingSources)
    .set({
      status: "processing",
      updatedAt: new Date(),
    })
    .where(eq(trainingSources.id, sourceId));

  try {
    let content = source.content || "";

    if (source.type === "url" && source.url) {
      content = await scrapeUrl(source.url);
    }

    if (!content.trim()) {
      await db
        .update(trainingSources)
        .set({
          status: "error",
          errorMessage: "No content found",
          updatedAt: new Date(),
        })
        .where(eq(trainingSources.id, sourceId));

      return;
    }

    await db
      .update(trainingSources)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(trainingSources.id, sourceId));

    const chunks = splitTextIntoChunks(content);

    const aiClient = source.channelId
      ? await getChannelAIClient(source.channelId)
      : null;

    if (!aiClient) {
      console.warn(
        `[Training] No active Sarvam AI configuration found for source ${sourceId}. Chunks will be stored without embeddings.`,
      );
    }

    await db
      .delete(trainingChunks)
      .where(eq(trainingChunks.sourceId, sourceId));

    for (const chunkText of chunks) {
      let embedding: number[] | null = null;

      if (aiClient) {
        try {
          embedding = await generateEmbedding(
            aiClient,
            chunkText,
            "document",
          );
        } catch (err) {
          console.error(
            "[Training] Sarvam embedding generation failed:",
            err,
          );

          throw err;
        }
      }

      await db.insert(trainingChunks).values({
        sourceId,
        siteId: source.siteId,
        content: chunkText,
        embedding,
        metadata: {
          sourceName: source.name,
          sourceType: source.type,
          sourceUrl: source.url,
        },
      });
    }

    await db
      .update(trainingSources)
      .set({
        status: "completed",
        chunkCount: chunks.length,
        updatedAt: new Date(),
      })
      .where(eq(trainingSources.id, sourceId));

    console.log(
      `[Training] Successfully processed source ${sourceId} with ${chunks.length} chunks.`,
    );
  } catch (error: any) {
    console.error("[Training] Source processing error:", error);

    await db
      .update(trainingSources)
      .set({
        status: "error",
        errorMessage: error.message?.substring(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(trainingSources.id, sourceId));
  }
}

/**
 * Generates an embedding for a Q&A pair using Sarvam.
 */
export async function generateQaEmbedding(
  qaId: string,
  channelId: string,
): Promise<void> {
  const aiClient = await getChannelAIClient(channelId);

  if (!aiClient) {
    console.warn(
      `[Training] No active Sarvam AI configuration for channel ${channelId}.`,
    );
    return;
  }

  const [qa] = await db
    .select()
    .from(trainingQaPairs)
    .where(eq(trainingQaPairs.id, qaId));

  if (!qa) {
    return;
  }

  try {
    const embedding = await generateEmbedding(
      aiClient,
      `${qa.question}\n${qa.answer}`,
      "document",
    );

    await db
      .update(trainingQaPairs)
      .set({
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(trainingQaPairs.id, qaId));

    console.log(`[Training] Sarvam Q&A embedding generated for ${qaId}.`);
  } catch (err) {
    console.error("[Training] Sarvam Q&A embedding generation failed:", err);
    throw err;
  }
}

/**
 * Searches training chunks and FAQ pairs using Sarvam embeddings.
 *
 * Falls back to basic text matching if embeddings are unavailable.
 */
export async function searchTrainingData(
  siteId: string,
  channelId: string,
  query: string,
  topK: number = 5,
): Promise<{
  chunks: string[];
  qaPairs: Array<{ question: string; answer: string }>;
}> {
  const aiClient = channelId
    ? await getChannelAIClient(channelId)
    : null;

  let queryEmbedding: number[] | null = null;

  if (aiClient) {
    try {
      queryEmbedding = await generateEmbedding(
        aiClient,
        query,
        "query",
      );
    } catch (err) {
      console.error(
        "[Training] Sarvam query embedding failed. Falling back to text search:",
        err,
      );
    }
  }

  const allChunks = await db
    .select()
    .from(trainingChunks)
    .where(eq(trainingChunks.siteId, siteId));

  let rankedChunks: Array<{ content: string; score: number }>;

  const compatibleChunks = allChunks.filter(
    (chunk) =>
      chunk.embedding &&
      (chunk.embedding as number[]).length === SARVAM_EMBEDDING_DIMENSIONS,
  );

  if (queryEmbedding && compatibleChunks.length > 0) {
    rankedChunks = compatibleChunks
      .map((chunk) => ({
        content: chunk.content,
        score: cosineSimilarity(
          queryEmbedding!,
          chunk.embedding as number[],
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } else {
    const queryWords = query.toLowerCase().split(/\s+/);

    rankedChunks = allChunks
      .map((chunk) => {
        const lower = chunk.content.toLowerCase();

        const score = queryWords.filter((word) =>
          lower.includes(word),
        ).length;

        return {
          content: chunk.content,
          score,
        };
      })
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  const allQa = await db
    .select()
    .from(trainingQaPairs)
    .where(
      and(
        eq(trainingQaPairs.siteId, siteId),
        eq(trainingQaPairs.isActive, true),
      ),
    );

  let rankedQa: Array<{
    question: string;
    answer: string;
    score: number;
  }>;

  const compatibleQa = allQa.filter(
    (qa) =>
      qa.embedding &&
      (qa.embedding as number[]).length === SARVAM_EMBEDDING_DIMENSIONS,
  );

  if (queryEmbedding && compatibleQa.length > 0) {
    rankedQa = compatibleQa
      .map((qa) => ({
        question: qa.question,
        answer: qa.answer,
        score: cosineSimilarity(
          queryEmbedding!,
          qa.embedding as number[],
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } else {
    const queryLower = query.toLowerCase();

    rankedQa = allQa
      .map((qa) => {
        const score =
          qa.question.toLowerCase().includes(queryLower) ||
          queryLower.includes(qa.question.toLowerCase())
            ? 1
            : 0;

        return {
          question: qa.question,
          answer: qa.answer,
          score,
        };
      })
      .filter((qa) => qa.score > 0)
      .slice(0, 3);
  }

  return {
    chunks: rankedChunks.map((chunk) => chunk.content),
    qaPairs: rankedQa.map((qa) => ({
      question: qa.question,
      answer: qa.answer,
    })),
  };
}

/**
 * Returns training statistics for a site.
 */
export async function getTrainingStats(siteId: string) {
  const sources = await db
    .select()
    .from(trainingSources)
    .where(eq(trainingSources.siteId, siteId));

  const chunksCount = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(trainingChunks)
    .where(eq(trainingChunks.siteId, siteId));

  const qaCount = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(trainingQaPairs)
    .where(eq(trainingQaPairs.siteId, siteId));

  return {
    sources,
    totalChunks: Number(chunksCount[0]?.count || 0),
    totalQaPairs: Number(qaCount[0]?.count || 0),
  };
}
