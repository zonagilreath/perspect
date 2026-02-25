import type { DatabaseSchema, GenerationConfig, Field } from "@/types/schema";

/**
 * Deterministic Zod schema generator — no LLM needed.
 * Produces the same output structure the LLM prompt would target:
 *   - Full schema per model
 *   - Create schema (omit id, createdAt, updatedAt)
 *   - Update schema (partial of create)
 *   - Inferred TypeScript types
 */
export function generateZodSchemas(
  schema: DatabaseSchema,
  config: GenerationConfig
): string {
  const lines: string[] = [];
  const { includeComments, strictMode } = config;

  lines.push('import { z } from "zod";');
  lines.push("");

  // ── Top-level enums ────────────────────────────────────────────────────────
  for (const enumDef of schema.enums) {
    if (includeComments) {
      lines.push(`/** ${enumDef.name} enum values */`);
    }
    const values = enumDef.values.map((v) => `"${v}"`).join(", ");
    lines.push(
      `export const ${lowerFirst(enumDef.name)}Schema = z.enum([${values}]);`
    );
    lines.push(
      `export type ${enumDef.name} = z.infer<typeof ${lowerFirst(enumDef.name)}Schema>;`
    );
    lines.push("");
  }

  // ── Per-model schemas ──────────────────────────────────────────────────────
  for (const model of schema.models) {
    const name = model.name;
    const dataFields = model.fields.filter((f) => f.type !== "relation");

    // Full schema
    if (includeComments) {
      lines.push(`/** Full ${name} schema with all fields */`);
    }
    lines.push(`export const ${lowerFirst(name)}Schema = z.object({`);
    for (const field of dataFields) {
      lines.push(
        `  ${field.name}: ${zodFieldType(field, schema, strictMode)},`
      );
    }
    lines.push("});");
    lines.push("");

    // Create schema (omit auto-managed fields)
    const createFields = dataFields.filter((f) => !isAutoField(f));
    if (includeComments) {
      lines.push(`/** Schema for creating a new ${name} */`);
    }
    lines.push(`export const create${name}Schema = z.object({`);
    for (const field of createFields) {
      lines.push(
        `  ${field.name}: ${zodFieldType(field, schema, strictMode)},`
      );
    }
    lines.push("});");
    lines.push("");

    // Update schema
    if (includeComments) {
      lines.push(`/** Schema for updating a ${name} (all fields optional) */`);
    }
    lines.push(
      `export const update${name}Schema = create${name}Schema.partial();`
    );
    lines.push("");

    // Inferred types
    lines.push(
      `export type ${name} = z.infer<typeof ${lowerFirst(name)}Schema>;`
    );
    lines.push(
      `export type Create${name}Input = z.infer<typeof create${name}Schema>;`
    );
    lines.push(
      `export type Update${name}Input = z.infer<typeof update${name}Schema>;`
    );
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Field → Zod type mapping ────────────────────────────────────────────────

function zodFieldType(
  field: Field,
  schema: DatabaseSchema,
  strictMode: boolean
): string {
  let base = zodBaseType(field, schema, strictMode);

  if (field.isList) {
    base = `z.array(${base})`;
  }

  if (!field.isRequired) {
    base += ".optional()";
  }

  return base;
}

function zodBaseType(
  field: Field,
  schema: DatabaseSchema,
  strictMode: boolean
): string {
  if (field.isId) {
    return "z.string().uuid()";
  }

  switch (field.type) {
    case "string":
      return strictMode && field.isRequired ? "z.string().min(1)" : "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "date":
    case "datetime":
      return "z.coerce.date()";
    case "enum": {
      const topEnum = schema.enums.find(
        (e) => field.enumValues && arraysEqual(e.values, field.enumValues)
      );
      if (topEnum) {
        return `${lowerFirst(topEnum.name)}Schema`;
      }
      if (field.enumValues?.length) {
        const values = field.enumValues.map((v) => `"${v}"`).join(", ");
        return `z.enum([${values}])`;
      }
      return "z.string()";
    }
    case "json":
      return "z.record(z.unknown())";
    default:
      return "z.string()";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAutoField(field: Field): boolean {
  return (
    field.isId ||
    ["createdAt", "updatedAt", "created_at", "updated_at"].includes(field.name)
  );
}

function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}
