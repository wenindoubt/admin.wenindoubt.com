import { EMBEDDING_MODEL, gemini } from "./gemini";

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vec : vec.map((v) => v / norm);
}

export async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
): Promise<number[]> {
  const result = await gemini.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: 768,
    },
  });

  const values = result.embeddings?.[0]?.values;
  if (!values) throw new Error("No embedding returned");

  return l2Normalize(values);
}
