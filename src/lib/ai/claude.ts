import Anthropic from "@anthropic-ai/sdk";

let _model: string | undefined;

export function getClaudeModel(): string {
  if (!_model) {
    _model = process.env.ANTHROPIC_MODEL;
    if (!_model) {
      throw new Error("Missing ANTHROPIC_MODEL env var — set it in .env.local");
    }
  }
  return _model;
}

const globalForClaude = globalThis as unknown as {
  claude: Anthropic | undefined;
};

export const claude =
  globalForClaude.claude ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForClaude.claude = claude;
}
