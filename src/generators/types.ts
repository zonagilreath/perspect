import type { DatabaseSchema, GenerationConfig, Field } from "@/types/schema";

/**
 * Deterministic TypeScript type definition generator — no LLM needed.
 * Produces:
 *   - String literal union types for enums
 *   - Branded ID types per model
 *   - Full interface per model
 *   - Create / Update input types
 *   - WithRelations types for models that have relations
 *   - Paginated<T>, SortDirection, SortBy<T> utilities
 */
export function generateTypeDefinitions(
  schema: DatabaseSchema,
  config: GenerationConfig
): string {
  const lines: string[] = [];
  const { includeComments } = config;

  // ── Enums as string literal unions ─────────────────────────────────────────
  if (schema.enums.length > 0) {
    for (const enumDef of schema.enums) {
      if (includeComments) {
        lines.push(`/** ${enumDef.name} enum */`);
      }
      const values = enumDef.values.map((v) => `"${v}"`).join(" | ");
      lines.push(`export type ${enumDef.name} = ${values};`);
      lines.push("");
    }
  }

  // ── Branded ID types ───────────────────────────────────────────────────────
  for (const model of schema.models) {
    lines.push(
      `export type ${model.name}Id = string & { __brand: "${model.name}Id" };`
    );
  }
  lines.push("");

  // ── Full interfaces ────────────────────────────────────────────────────────
  for (const model of schema.models) {
    if (includeComments) {
      lines.push(`/** Full ${model.name} entity */`);
    }
    lines.push(`export interface ${model.name} {`);
    for (const field of model.fields) {
      if (field.type === "relation") continue;
      const tsType = tsFieldType(field, model.name, schema);
      const optional = field.isRequired ? "" : "?";
      if (includeComments && field.description) {
        lines.push(`  /** ${field.description} */`);
      }
      lines.push(`  ${field.name}${optional}: ${tsType};`);
    }
    lines.push("}");
    lines.push("");
  }

  // ── Create input types ─────────────────────────────────────────────────────
  for (const model of schema.models) {
    const createFields = model.fields.filter(
      (f) => f.type !== "relation" && !isAutoField(f)
    );
    if (includeComments) {
      lines.push(`/** Input for creating a new ${model.name} */`);
    }
    lines.push(`export interface Create${model.name}Input {`);
    for (const field of createFields) {
      const tsType = tsFieldType(field, model.name, schema);
      const optional = field.isRequired ? "" : "?";
      lines.push(`  ${field.name}${optional}: ${tsType};`);
    }
    lines.push("}");
    lines.push("");
  }

  // ── Update input types ─────────────────────────────────────────────────────
  for (const model of schema.models) {
    if (includeComments) {
      lines.push(
        `/** Input for updating a ${model.name} (all fields optional) */`
      );
    }
    lines.push(
      `export type Update${model.name}Input = Partial<Create${model.name}Input>;`
    );
    lines.push("");
  }

  // ── WithRelations types ────────────────────────────────────────────────────
  for (const model of schema.models) {
    const relationFields = model.fields.filter(
      (f) => f.type === "relation" && f.relation
    );
    if (relationFields.length > 0) {
      if (includeComments) {
        lines.push(`/** ${model.name} with all relations loaded */`);
      }
      lines.push(
        `export interface ${model.name}WithRelations extends ${model.name} {`
      );
      for (const field of relationFields) {
        const relModel = field.relation!.model;
        if (field.isList) {
          lines.push(`  ${field.name}: ${relModel}[];`);
        } else {
          const optional = field.isRequired ? "" : "?";
          lines.push(`  ${field.name}${optional}: ${relModel};`);
        }
      }
      lines.push("}");
      lines.push("");
    }
  }

  // ── Utility types ──────────────────────────────────────────────────────────
  lines.push(
    "// ─── Utility Types ───────────────────────────────────────────────────────"
  );
  lines.push("");
  lines.push("export interface Paginated<T> {");
  lines.push("  items: T[];");
  lines.push("  nextCursor?: string;");
  lines.push("  total: number;");
  lines.push("}");
  lines.push("");
  lines.push('export type SortDirection = "asc" | "desc";');
  lines.push("");
  lines.push("export interface SortBy<T> {");
  lines.push("  field: keyof T;");
  lines.push("  direction: SortDirection;");
  lines.push("}");

  return lines.join("\n");
}

// ─── Field → TypeScript type mapping ─────────────────────────────────────────

function tsFieldType(
  field: Field,
  modelName: string,
  schema: DatabaseSchema
): string {
  let base = tsBaseType(field, modelName, schema);

  if (field.isList) {
    base += "[]";
  }

  return base;
}

function tsBaseType(
  field: Field,
  modelName: string,
  schema: DatabaseSchema
): string {
  if (field.isId) {
    return `${modelName}Id`;
  }

  switch (field.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
    case "datetime":
      return "Date";
    case "enum": {
      const topEnum = schema.enums.find(
        (e) => field.enumValues && arraysEqual(e.values, field.enumValues)
      );
      if (topEnum) return topEnum.name;
      if (field.enumValues?.length) {
        return field.enumValues.map((v) => `"${v}"`).join(" | ");
      }
      return "string";
    }
    case "json":
      return "Record<string, unknown>";
    default:
      return "string";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAutoField(field: Field): boolean {
  return (
    field.isId ||
    ["createdAt", "updatedAt", "created_at", "updated_at"].includes(field.name)
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}
