import { z } from "zod";

// ─── Intermediate Representation ─────────────────────────────────────────────
// Every input format (Prisma, SQL, English) normalizes to this shape.
// This is what gets sent to the LLM for code generation.

export const FieldTypeEnum = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "enum",
  "json",
  "relation",
]);
export type FieldType = z.infer<typeof FieldTypeEnum>;

export const RelationTypeEnum = z.enum([
  "one-to-one",
  "one-to-many",
  "many-to-many",
]);
export type RelationType = z.infer<typeof RelationTypeEnum>;

export const FieldSchema = z.object({
  name: z.string(),
  type: FieldTypeEnum,
  isRequired: z.boolean(),
  isUnique: z.boolean(),
  isId: z.boolean(),
  isList: z.boolean().default(false),
  default: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
  relation: z
    .object({
      model: z.string(),
      type: RelationTypeEnum,
      foreignKey: z.string().optional(),
    })
    .optional(),
  description: z.string().optional(),
});
export type Field = z.infer<typeof FieldSchema>;

export const ModelSchema = z.object({
  name: z.string(),
  fields: z.array(FieldSchema),
  description: z.string().optional(),
});
export type Model = z.infer<typeof ModelSchema>;

export const DatabaseSchemaSchema = z.object({
  models: z.array(ModelSchema),
  enums: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
      })
    )
    .default([]),
});
export type DatabaseSchema = z.infer<typeof DatabaseSchemaSchema>;

// ─── Input Format ────────────────────────────────────────────────────────────

export const InputFormatEnum = z.enum(["prisma", "sql", "english"]);
export type InputFormat = z.infer<typeof InputFormatEnum>;

// ─── Generation Target ──────────────────────────────────────────────────────

export const GenerationTargetEnum = z.enum([
  "zod",
  "trpc",
  "react-form",
  "types",
]);
export type GenerationTarget = z.infer<typeof GenerationTargetEnum>;

// ─── Generation Config ──────────────────────────────────────────────────────

export const GenerationConfigSchema = z.object({
  formLibrary: z.enum(["react-hook-form", "native"]).default("react-hook-form"),
  ormStyle: z.enum(["prisma", "drizzle"]).default("prisma"),
  apiStyle: z.enum(["trpc", "rest"]).default("trpc"),
  includeComments: z.boolean().default(true),
  strictMode: z.boolean().default(true),
});
export type GenerationConfig = z.infer<typeof GenerationConfigSchema>;

// ─── API Request/Response ───────────────────────────────────────────────────

export const GenerateRequestSchema = z.object({
  schema: DatabaseSchemaSchema,
  target: GenerationTargetEnum,
  config: GenerationConfigSchema.optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const ParseRequestSchema = z.object({
  input: z.string(),
  format: InputFormatEnum,
});
export type ParseRequest = z.infer<typeof ParseRequestSchema>;
