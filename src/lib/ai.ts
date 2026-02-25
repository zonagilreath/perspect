import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export function getModel() {
  const provider = process.env.AI_PROVIDER ?? "anthropic";

  if (provider === "google") {
    return google("gemini-2.5-flash");
  }

  return anthropic("claude-haiku-4-5-20251001");
}
