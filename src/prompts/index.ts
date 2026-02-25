import type { DatabaseSchema, GenerationConfig, GenerationTarget } from "@/types/schema";

// ─── English → Schema parsing prompt ────────────────────────────────────────

export function buildParsePrompt(englishDescription: string): string {
  return `You are a database schema architect. Given a plain English description of a data model, produce a structured JSON representation.

Rules:
- Infer reasonable field types from context
- Always include an "id" field (string type, required, unique, isId: true)
- Always include "createdAt" (datetime) and "updatedAt" (datetime) fields
- Use camelCase for field names
- Use PascalCase for model names
- If relationships are described, include them as relation-type fields
- Be conservative: only include fields that are clearly described or strongly implied

English description:
${englishDescription}

Respond with ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "models": [
    {
      "name": "ModelName",
      "fields": [
        {
          "name": "fieldName",
          "type": "string|number|boolean|date|datetime|enum|json|relation",
          "isRequired": true,
          "isUnique": false,
          "isId": false,
          "isList": false,
          "default": "optional default value",
          "enumValues": ["optional", "enum", "values"],
          "relation": {
            "model": "RelatedModel",
            "type": "one-to-one|one-to-many|many-to-many"
          },
          "description": "optional description"
        }
      ]
    }
  ],
  "enums": [
    { "name": "EnumName", "values": ["VALUE_A", "VALUE_B"] }
  ]
}`;
}

// ─── Code generation prompts ────────────────────────────────────────────────

function schemaToContext(schema: DatabaseSchema): string {
  return JSON.stringify(schema, null, 2);
}

export function buildGenerationPrompt(
  schema: DatabaseSchema,
  target: GenerationTarget,
  config?: GenerationConfig
): string {
  const ctx = schemaToContext(schema);
  const cfg = config ?? {
    formLibrary: "react-hook-form",
    ormStyle: "prisma",
    apiStyle: "trpc",
    includeComments: true,
    strictMode: true,
  };

  const prompts: Record<GenerationTarget, string> = {
    zod: buildZodPrompt(ctx, cfg),
    trpc: buildTrpcPrompt(ctx, cfg),
    "react-form": buildFormPrompt(ctx, cfg),
    types: buildTypesPrompt(ctx, cfg),
  };

  return prompts[target];
}

function buildZodPrompt(ctx: string, cfg: GenerationConfig): string {
  return `You are a senior TypeScript engineer who is obsessive about type safety. Generate Zod validation schemas from the database schema below.

Requirements:
- Export a Zod schema for each model's CREATE input (omit id, createdAt, updatedAt)
- Export a Zod schema for each model's UPDATE input (all fields optional via .partial())
- Export a Zod schema for each model's full shape (all fields)
- Use z.string().uuid() for id fields
- Use z.coerce.date() for date/datetime fields (handles string → Date conversion)
- Use z.string().min(1) for required string fields (don't allow empty strings)
- Use z.nativeEnum() for enum types — define the enum as a const object first
- ${cfg.includeComments ? "Include JSDoc comments explaining each schema" : "Omit comments for brevity"}
- Use .transform() where appropriate (e.g., trimming strings)
- Export inferred TypeScript types using z.infer<typeof SchemaName>

Database schema:
${ctx}

Generate ONLY valid TypeScript code. No markdown fences, no explanations. The code should be a single file that can be saved as schemas.ts and imported directly.`;
}

function buildTrpcPrompt(ctx: string, cfg: GenerationConfig): string {
  const style = cfg.apiStyle === "trpc" ? "tRPC" : "REST (Express/Fastify)";

  if (cfg.apiStyle === "trpc") {
    return `You are a senior TypeScript engineer. Generate tRPC router definitions from the database schema below.

Requirements:
- Import Zod schemas from "./schemas" (assume they exist — name them like: create{Model}Schema, update{Model}Schema)
- Use the t.router() and t.procedure pattern
- For each model, generate these procedures:
  - getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(...)
  - list: publicProcedure.input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).default(20) })).query(...)
  - create: publicProcedure.input(create{Model}Schema).mutation(...)
  - update: publicProcedure.input(z.object({ id: z.string().uuid(), data: update{Model}Schema })).mutation(...)
  - delete: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(...)
- Use ${cfg.ormStyle === "prisma" ? "Prisma Client" : "Drizzle ORM"} in the procedure bodies
- Include cursor-based pagination for list queries
- ${cfg.includeComments ? "Include JSDoc comments" : "Omit comments"}
- Export each model's router and a merged appRouter

Database schema:
${ctx}

Generate ONLY valid TypeScript code. No markdown fences, no explanations.`;
  }

  return `You are a senior TypeScript engineer. Generate RESTful API route handlers from the database schema below.

Requirements:
- Use Express-style route handlers (req, res, next)
- Import Zod schemas from "./schemas" for input validation
- For each model, generate CRUD endpoints:
  - GET /{model}/:id
  - GET /{model} (with pagination query params)
  - POST /{model}
  - PATCH /{model}/:id
  - DELETE /{model}/:id
- Validate request body/params with Zod .parse()
- Wrap handlers in try/catch with proper error responses
- Use ${cfg.ormStyle === "prisma" ? "Prisma Client" : "Drizzle ORM"} for data access
- ${cfg.includeComments ? "Include JSDoc comments" : "Omit comments"}

Database schema:
${ctx}

Generate ONLY valid TypeScript code. No markdown fences, no explanations.`;
}

function buildFormPrompt(ctx: string, cfg: GenerationConfig): string {
  const formLib = cfg.formLibrary === "react-hook-form"
    ? "react-hook-form with @hookform/resolvers/zod"
    : "native React state with manual validation";

  return `You are a senior React/TypeScript engineer. Generate form components from the database schema below.

Requirements:
- Generate a Create form and an Edit form for each model
- Use ${formLib} for form management
- Import Zod schemas from "./schemas" (assume they exist — name them like: create{Model}Schema)
- Map field types to appropriate inputs:
  - string → <input type="text" /> (or <textarea> if field name suggests long text like "description", "bio", "content")
  - number → <input type="number" />
  - boolean → <input type="checkbox" /> with a label
  - date/datetime → <input type="date" /> or <input type="datetime-local" />
  - enum → <select> with options from enumValues
  - relation → <select> with a placeholder (actual options come from parent)
- Display validation errors below each field
- Use TypeScript generics where appropriate
- Style with Tailwind CSS utility classes
- Use accessible markup: <label>, aria attributes, proper htmlFor
- ${cfg.includeComments ? "Include brief comments" : "Omit comments"}
- Export each form as a named export

Database schema:
${ctx}

Generate ONLY valid TypeScript/React code (TSX). No markdown fences, no explanations. The code should be a single file that can be saved as forms.tsx and imported directly.`;
}

function buildTypesPrompt(ctx: string, _cfg: GenerationConfig): string {
  return `You are a senior TypeScript engineer. Generate TypeScript type definitions and utility types from the database schema below.

Requirements:
- Export an interface for each model (full shape with all fields)
- Export a "Create" input type for each model (omit id, createdAt, updatedAt)
- Export an "Update" input type for each model (all editable fields optional)
- Export a "WithRelations" type that includes nested relation types
- Use string literal union types for enums
- Use branded types for IDs: type UserId = string & { __brand: "UserId" }
- Include utility types:
  - Paginated<T> = { items: T[]; nextCursor?: string; total: number }
  - SortDirection = "asc" | "desc"
  - SortBy<T> = { field: keyof T; direction: SortDirection }
- Keep it clean and idiomatic

Database schema:
${ctx}

Generate ONLY valid TypeScript code. No markdown fences, no explanations.`;
}
