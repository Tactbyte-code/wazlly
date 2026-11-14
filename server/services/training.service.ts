import { GoogleGenAI } from "@google/genai";
import { chromium } from "playwright";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  trainingSources,
  trainingChunks,
  trainingQaPairs,
} from "@shared/schema";

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
const GEMINI_EMBEDDING_DIMENSIONS = 768;

const QA_MATCH_THRESHOLD = 0.85;

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

async function generateEmbedding(
  text: string,
  type: "document" | "query",
): Promise<number[]> {
  if (!text.trim()) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const client = getGeminiClient();

  const input =
    type === "query"
      ? `task: search result | query: ${text}`
      : `title: none | text: ${text}`;

  const response = await client.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: input,
    config: {
      outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length !== GEMINI_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid Gemini embedding. Expected ${GEMINI_EMBEDDING_DIMENSIONS} dimensions.`,
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

function cosineSimilarity(a: number[], b: number[]): number {
  if (
    a.length !== GEMINI_EMBEDDING_DIMENSIONS ||
    b.length !== GEMINI_EMBEDDING_DIMENSIONS ||
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

    console.log("[Playwright] Extracted content length:", finalContent.length);

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

export async function processTrainingSource(sourceId: string): Promise<void> {
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
      throw new Error("No content found");
    }

    await db
      .update(trainingSources)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(trainingSources.id, sourceId));

    const chunks = splitTextIntoChunks(content);

    if (chunks.length === 0) {
      throw new Error("No valid chunks generated from source.");
    }

    // Generate all embeddings before replacing existing chunks.
    const chunksWithEmbeddings: Array<{
      content: string;
      embedding: number[];
    }> = [];

    for (const chunkText of chunks) {
      const embedding = await generateEmbedding(chunkText, "document");

      chunksWithEmbeddings.push({
        content: chunkText,
        embedding,
      });
    }

    // Replace existing chunks only after every embedding succeeds.
    await db.transaction(async (tx) => {
      await tx
        .delete(trainingChunks)
        .where(eq(trainingChunks.sourceId, sourceId));

      await tx.insert(trainingChunks).values(
        chunksWithEmbeddings.map((chunk) => ({
          sourceId,
          siteId: source.siteId,
          content: chunk.content,
          embedding: chunk.embedding,
          metadata: {
            sourceName: source.name,
            sourceType: source.type,
            sourceUrl: source.url,
          },
        })),
      );
    });

    await db
      .update(trainingSources)
      .set({
        status: "completed",
        chunkCount: chunks.length,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(trainingSources.id, sourceId));

    console.log(
      `[Training] Successfully processed source ${sourceId} with ${chunks.length} Gemini embeddings.`,
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
 * Generates an embedding for a Q&A pair using Gemini.
 */
export async function generateQaEmbedding(
  qaId: string,
  _channelId: string,
): Promise<void> {
  const [qa] = await db
    .select()
    .from(trainingQaPairs)
    .where(eq(trainingQaPairs.id, qaId));

  if (!qa) {
    return;
  }

  try {
    const embedding = await generateEmbedding(
      qa.question,
      "document",
    );

    await db
      .update(trainingQaPairs)
      .set({
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(trainingQaPairs.id, qaId));

    console.log(`[Training] Gemini Q&A embedding generated for ${qaId}.`);
  } catch (err) {
    console.error("[Training] Gemini Q&A embedding generation failed:", err);

    throw err;
  }
}

/**
 * Searches training chunks and FAQ pairs using Gemini embeddings.
 *
 * Falls back to basic text matching if embeddings are unavailable.
 */

export async function searchTrainingData(
  siteId: string,
  _channelId: string,
  query: string,
  topK: number = 5,
): Promise<{
  matchedQa: {
    question: string;
    answer: string;
    score: number;
  } | null;
  chunks: string[];
  qaPairs: Array<{ question: string; answer: string }>;
}> {
  // 1. Fetch active Q&A pairs for this site.
  const allQa = await db
    .select()
    .from(trainingQaPairs)
    .where(
      and(
        eq(trainingQaPairs.siteId, siteId),
        eq(trainingQaPairs.isActive, true),
      ),
    );

  // 2. Check for an exact question match first.
  const normalizedQuery = normalizeQuestion(query);

  const exactMatch = allQa.find(
    (qa) => normalizeQuestion(qa.question) === normalizedQuery,
  );

  if (exactMatch) {
    return {
      matchedQa: {
        question: exactMatch.question,
        answer: exactMatch.answer,
        score: 1,
      },
      chunks: [],
      qaPairs: [],
    };
  }

  // 3. Generate Gemini embedding for semantic matching.
  let queryEmbedding: number[] | null = null;

  try {
    queryEmbedding = await generateEmbedding(query, "query");
  } catch (err) {
    console.error(
      "[Training] Gemini query embedding failed. Falling back to text search:",
      err,
    );
  }

  // 4. Rank Q&A pairs using semantic similarity.
  let rankedQa: Array<{
    question: string;
    answer: string;
    score: number;
  }> = [];

  const compatibleQa = allQa.filter(
    (qa) =>
      Array.isArray(qa.embedding) &&
      qa.embedding.length === GEMINI_EMBEDDING_DIMENSIONS,
  );

  if (queryEmbedding && compatibleQa.length > 0) {
    rankedQa = compatibleQa
      .map((qa) => ({
        question: qa.question,
        answer: qa.answer,
        score: cosineSimilarity(queryEmbedding!, qa.embedding as number[]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // 5. Return a high-confidence Q&A match directly.
    const bestQa = rankedQa[0];

    if (bestQa && bestQa.score >= QA_MATCH_THRESHOLD) {
      return {
        matchedQa: bestQa,
        chunks: [],
        qaPairs: [],
      };
    }
  } else {
    // Fallback when embeddings are unavailable.
    const queryLower = normalizedQuery;

    rankedQa = allQa
      .map((qa) => {
        const normalizedQuestion = normalizeQuestion(qa.question);

        const score =
          normalizedQuestion.includes(queryLower) ||
          queryLower.includes(normalizedQuestion)
            ? 1
            : 0;

        return {
          question: qa.question,
          answer: qa.answer,
          score,
        };
      })
      .filter((qa) => qa.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  // 6. No confident Q&A match. Search website training chunks.
  const allChunks = await db
    .select()
    .from(trainingChunks)
    .where(eq(trainingChunks.siteId, siteId));

  let rankedChunks: Array<{
    content: string;
    score: number;
  }>;

  const compatibleChunks = allChunks.filter(
    (chunk) =>
      Array.isArray(chunk.embedding) &&
      chunk.embedding.length === GEMINI_EMBEDDING_DIMENSIONS,
  );

  if (queryEmbedding && compatibleChunks.length > 0) {
    rankedChunks = compatibleChunks
      .map((chunk) => ({
        content: chunk.content,
        score: cosineSimilarity(queryEmbedding!, chunk.embedding as number[]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } else {
    const queryWords = query.toLowerCase().split(/\s+/);

    rankedChunks = allChunks
      .map((chunk) => {
        const lower = chunk.content.toLowerCase();

        const score = queryWords.filter((word) => lower.includes(word)).length;

        return {
          content: chunk.content,
          score,
        };
      })
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // 7. Return website context and lower-confidence Q&A context.
  return {
    matchedQa: null,
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
