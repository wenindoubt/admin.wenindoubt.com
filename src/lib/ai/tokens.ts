import { claude, getClaudeModel } from "./claude";

/** Count exact tokens for a text string using Anthropic's tokenizer */
export async function countTokens(text: string): Promise<number> {
  const result = await claude.messages.countTokens({
    model: getClaudeModel(),
    messages: [{ role: "user", content: text }],
  });
  return result.input_tokens;
}
