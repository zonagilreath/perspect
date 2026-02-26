import { NextRequest } from "next/server";
import { streamText } from "ai";
import { GenerateRequestSchema } from "@/types/schema";
import { buildGenerationPrompt } from "@/prompts";
import { getModel } from "@/lib/ai";
import { isTemplateTarget, generateFromTemplate } from "@/generators";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

const DEFAULT_CONFIG = {
  formLibrary: "react-hook-form" as const,
  ormStyle: "prisma" as const,
  apiStyle: "trpc" as const,
  includeComments: true,
  strictMode: true,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schema, target, config } = GenerateRequestSchema.parse(body);
    const resolvedConfig = config ?? DEFAULT_CONFIG;

    // Deterministic targets are free — only rate-limit LLM calls
    if (isTemplateTarget(target)) {
      const code = generateFromTemplate(schema, target, resolvedConfig);

      return new Response(code, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // LLM-based generation — rate limit these
    const limited = rateLimit(req);
    if (limited) return limited;

    const prompt = buildGenerationPrompt(schema, target, resolvedConfig);
    const model = getModel();

    const result = streamText({
      model,
      prompt,
      temperature: 0.2,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Generate error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Generation failed",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
