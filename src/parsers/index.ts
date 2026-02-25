import type { DatabaseSchema, InputFormat } from "@/types/schema";
import { parsePrismaSchema } from "./prisma";
import { parseSqlSchema } from "./sql";

/**
 * Parse raw schema input into our intermediate representation.
 * Prisma and SQL are parsed deterministically.
 * English requires an LLM call (handled separately in the API route).
 */
export function parseSchema(
  input: string,
  format: InputFormat
): DatabaseSchema | null {
  switch (format) {
    case "prisma":
      return parsePrismaSchema(input);
    case "sql":
      return parseSqlSchema(input);
    case "english":
      // English parsing requires LLM — return null to signal the API route
      // should use AI-based parsing instead
      return null;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Auto-detect schema format from content.
 */
export function detectFormat(input: string): InputFormat {
  const trimmed = input.trim();

  if (/^(model|datasource|generator|enum)\s+\w+\s*\{/m.test(trimmed)) {
    return "prisma";
  }

  if (/CREATE\s+(TABLE|TYPE)/i.test(trimmed)) {
    return "sql";
  }

  return "english";
}
