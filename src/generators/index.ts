import type {
  DatabaseSchema,
  GenerationConfig,
  GenerationTarget,
} from "@/types/schema";
import { generateZodSchemas } from "./zod";
import { generateTypeDefinitions } from "./types";
import { generateTrpcRouter } from "./trpc";

/**
 * Targets generated deterministically — no LLM call needed.
 * tRPC is now deterministic: the generator encodes our opinions directly
 * rather than hoping the model produces consistent output.
 */
const TEMPLATE_TARGETS = new Set<GenerationTarget>(["zod", "types", "trpc"]);

export function isTemplateTarget(target: GenerationTarget): boolean {
  return TEMPLATE_TARGETS.has(target);
}

export function generateFromTemplate(
  schema: DatabaseSchema,
  target: GenerationTarget,
  config: GenerationConfig
): string {
  switch (target) {
    case "zod":
      return generateZodSchemas(schema, config);
    case "types":
      return generateTypeDefinitions(schema, config);
    case "trpc":
      return generateTrpcRouter(schema, config);
    default:
      throw new Error(`No template generator for target: ${target}`);
  }
}
