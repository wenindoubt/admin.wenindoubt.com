import { GoogleGenAI } from "@google/genai";

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenAI | undefined;
};

export const gemini =
  globalForGemini.gemini ??
  new GoogleGenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForGemini.gemini = gemini;
}

export const GEMINI_MODEL = "gemini-3.1-pro-preview";
export const EMBEDDING_MODEL = "gemini-embedding-2-preview";
