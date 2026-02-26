import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { ParseRequestSchema, DatabaseSchemaSchema } from "@/types/schema";
import { parseSchema } from "@/parsers";
import { buildParsePrompt } from "@/prompts";
import { getModel } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, format } = ParseRequestSchema.parse(body);

    // Prisma and SQL are parsed deterministically
    const parsed = parseSchema(input, format);

    if (parsed) {
      return NextResponse.json(parsed);
    }

    // English requires LLM parsing — rate limit these
    const limited = rateLimit(req);
    if (limited) return limited;

    const model = getModel();
    const result = await generateText({
      model,
      prompt: buildParsePrompt(input),
      temperature: 0.1, // Low temp for structural accuracy
    });

    // Parse and validate the LLM output
    const rawJson = result.text.trim();
    const parsedSchema = DatabaseSchemaSchema.parse(JSON.parse(rawJson));

    return NextResponse.json(parsedSchema);
  } catch (error) {
    console.error("Parse error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response as valid JSON. Try again or use Prisma/SQL format." },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse schema" },
      { status: 400 }
    );
  }
}
