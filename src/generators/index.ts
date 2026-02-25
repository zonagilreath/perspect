import type {
  DatabaseSchema,
  GenerationConfig,
  GenerationTarget,
} from "@/types/schema";
import { generateZodSchemas } from "./zod";
import { generateTypeDefinitions } from "./types";

/** Targets that are generated deterministically — no LLM call needed */
const TEMPLATE_TARGETS = new Set<GenerationTarget>(["zod", "types"]);

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
    default:
      throw new Error(`No template generator for target: ${target}`);
  }
}
