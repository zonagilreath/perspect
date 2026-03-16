import type { DatabaseSchema, GenerationConfig, Field } from "@/types/schema";

/**
 * Deterministic tRPC router generator.
 *
 * Opinions encoded here (not left to the LLM):
 *  - All schemas imported from "./schemas" with consistent naming
 *  - publicProcedure for reads, protectedProcedure scaffold for mutations
 *  - TRPCError with typed codes (NOT_FOUND, BAD_REQUEST, UNAUTHORIZED)
 *  - Cursor-based pagination on every list procedure
 *  - Batched relation loaders (dataloader pattern) for every relation field
 *  - Per-model router + merged appRouter export
 *  - Drizzle variant generated when ormStyle === "drizzle"
 */
export function generateTrpcRouter(
  schema: DatabaseSchema,
  config: GenerationConfig
): string {
  const lines: string[] = [];
  const { includeComments, ormStyle } = config;
  const isPrisma = ormStyle !== "drizzle";

  // ── Imports ────────────────────────────────────────────────────────────────
  lines.push(`import { z } from "zod";`);
  lines.push(`import { TRPCError } from "@trpc/server";`);
  lines.push(`import { router, publicProcedure, protectedProcedure } from "./trpc";`);
  lines.push("");

  // Import all Zod schemas up front — cross-model awareness
  const schemaImports = schema.models
    .map((m) => `create${m.name}Schema, update${m.name}Schema`)
    .join(",\n  ");
  lines.push(`import {`);
  lines.push(`  ${schemaImports}`);
  lines.push(`} from "./schemas";`);
  lines.push("");

  if (isPrisma) {
    lines.push(`import { prisma } from "./db";`);
  } else {
    lines.push(`import { db } from "./db";`);
    const tableImports = schema.models
      .map((m) => lowerFirst(m.name))
      .join(", ");
    lines.push(`import { ${tableImports} } from "./schema";`);
  }
  lines.push("");

  // ── Relation loaders (dataloader pattern) ──────────────────────────────────
  const relationMap = buildRelationMap(schema);
  if (relationMap.size > 0) {
    if (includeComments) {
      lines.push(`// ─── Relation loaders ────────────────────────────────────────────────────`);
      lines.push(`// Batched loaders for relation fields. Use these inside WithRelations`);
      lines.push(`// procedures instead of N+1 nested queries.`);
      lines.push("");
    }

    for (const [modelName, relatedModels] of Array.from(relationMap.entries())) {
      for (const related of relatedModels) {
        const fnName = `load${related}sFor${modelName}`;
        if (includeComments) {
          lines.push(`/** Batch-load ${related} records for a set of ${modelName} IDs */`);
        }
        if (isPrisma) {
          lines.push(`async function ${fnName}(${lowerFirst(modelName)}Ids: string[]) {`);
          lines.push(`  const rows = await prisma.${lowerFirst(related)}.findMany({`);
          lines.push(`    where: { ${lowerFirst(modelName)}Id: { in: ${lowerFirst(modelName)}Ids } },`);
          lines.push(`  });`);
          lines.push(`  const map = new Map<string, typeof rows>(`);
          lines.push(`    ${lowerFirst(modelName)}Ids.map((id) => [id, []])`);
          lines.push(`  );`);
          lines.push(`  for (const row of rows) {`);
          lines.push(`    map.get(row.${lowerFirst(modelName)}Id)?.push(row);`);
          lines.push(`  }`);
          lines.push(`  return map;`);
        } else {
          lines.push(`async function ${fnName}(${lowerFirst(modelName)}Ids: string[]) {`);
          lines.push(`  const rows = await db.select().from(${lowerFirst(related)})`);
          lines.push(`    .where(inArray(${lowerFirst(related)}.${lowerFirst(modelName)}Id, ${lowerFirst(modelName)}Ids));`);
          lines.push(`  const map = new Map<string, typeof rows>(`);
          lines.push(`    ${lowerFirst(modelName)}Ids.map((id) => [id, []])`);
          lines.push(`  );`);
          lines.push(`  for (const row of rows) {`);
          lines.push(`    map.get(row.${lowerFirst(modelName)}Id)?.push(row);`);
          lines.push(`  }`);
          lines.push(`  return map;`);
        }
        lines.push(`}`);
        lines.push("");
      }
    }
  }

  // ── Per-model routers ──────────────────────────────────────────────────────
  const routerNames: string[] = [];

  for (const model of schema.models) {
    const name = model.name;
    const lower = lowerFirst(name);
    const routerName = `${lower}Router`;
    routerNames.push(routerName);

    if (includeComments) {
      lines.push(`// ─── ${name} router ` + "─".repeat(Math.max(0, 60 - name.length)));
    }
    lines.push(`export const ${routerName} = router({`);
    lines.push("");

    // getById
    if (includeComments) lines.push(`  /** Get a single ${name} by ID */`);
    lines.push(`  getById: publicProcedure`);
    lines.push(`    .input(z.object({ id: z.string().uuid() }))`);
    lines.push(`    .query(async ({ input }) => {`);
    if (isPrisma) {
      lines.push(`      const ${lower} = await prisma.${lower}.findUnique({`);
      lines.push(`        where: { id: input.id },`);
      lines.push(`      });`);
    } else {
      lines.push(`      const [${lower}] = await db.select().from(${lower}Table)`);
      lines.push(`        .where(eq(${lower}Table.id, input.id)).limit(1);`);
    }
    lines.push(`      if (!${lower}) {`);
    lines.push(`        throw new TRPCError({`);
    lines.push(`          code: "NOT_FOUND",`);
    lines.push(`          message: "${name} not found",`);
    lines.push(`        });`);
    lines.push(`      }`);
    lines.push(`      return ${lower};`);
    lines.push(`    }),`);
    lines.push("");

    // list with cursor pagination
    if (includeComments) {
      lines.push(`  /** List ${name} records with cursor-based pagination */`);
    }
    lines.push(`  list: publicProcedure`);
    lines.push(`    .input(`);
    lines.push(`      z.object({`);
    lines.push(`        cursor: z.string().uuid().optional(),`);
    lines.push(`        limit: z.number().int().min(1).max(100).default(20),`);
    lines.push(`      })`);
    lines.push(`    )`);
    lines.push(`    .query(async ({ input }) => {`);
    lines.push(`      const { cursor, limit } = input;`);
    if (isPrisma) {
      lines.push(`      const items = await prisma.${lower}.findMany({`);
      lines.push(`        take: limit + 1,`);
      lines.push(`        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),`);
      lines.push(`        orderBy: { createdAt: "desc" },`);
      lines.push(`      });`);
    } else {
      lines.push(`      const items = await db.select().from(${lower}Table)`);
      lines.push(`        .orderBy(desc(${lower}Table.createdAt))`);
      lines.push(`        .limit(limit + 1);`);
    }
    lines.push(`      let nextCursor: string | undefined;`);
    lines.push(`      if (items.length > limit) {`);
    lines.push(`        const next = items.pop()!;`);
    lines.push(`        nextCursor = next.id;`);
    lines.push(`      }`);
    lines.push(`      return { items, nextCursor };`);
    lines.push(`    }),`);
    lines.push("");

    // create — protectedProcedure
    if (includeComments) lines.push(`  /** Create a new ${name} */`);
    lines.push(`  create: protectedProcedure`);
    lines.push(`    .input(create${name}Schema)`);
    lines.push(`    .mutation(async ({ input, ctx }) => {`);
    if (isPrisma) {
      lines.push(`      return prisma.${lower}.create({ data: input });`);
    } else {
      lines.push(`      const [created] = await db.insert(${lower}Table).values(input).returning();`);
      lines.push(`      return created;`);
    }
    lines.push(`    }),`);
    lines.push("");

    // update — protectedProcedure
    if (includeComments) lines.push(`  /** Update an existing ${name} */`);
    lines.push(`  update: protectedProcedure`);
    lines.push(`    .input(z.object({ id: z.string().uuid(), data: update${name}Schema }))`);
    lines.push(`    .mutation(async ({ input, ctx }) => {`);
    if (isPrisma) {
      lines.push(`      const existing = await prisma.${lower}.findUnique({ where: { id: input.id } });`);
      lines.push(`      if (!existing) {`);
      lines.push(`        throw new TRPCError({ code: "NOT_FOUND", message: "${name} not found" });`);
      lines.push(`      }`);
      lines.push(`      return prisma.${lower}.update({`);
      lines.push(`        where: { id: input.id },`);
      lines.push(`        data: input.data,`);
      lines.push(`      });`);
    } else {
      lines.push(`      const [updated] = await db.update(${lower}Table)`);
      lines.push(`        .set({ ...input.data, updatedAt: new Date() })`);
      lines.push(`        .where(eq(${lower}Table.id, input.id))`);
      lines.push(`        .returning();`);
      lines.push(`      if (!updated) {`);
      lines.push(`        throw new TRPCError({ code: "NOT_FOUND", message: "${name} not found" });`);
      lines.push(`      }`);
      lines.push(`      return updated;`);
    }
    lines.push(`    }),`);
    lines.push("");

    // delete — protectedProcedure
    if (includeComments) lines.push(`  /** Delete a ${name} by ID */`);
    lines.push(`  delete: protectedProcedure`);
    lines.push(`    .input(z.object({ id: z.string().uuid() }))`);
    lines.push(`    .mutation(async ({ input, ctx }) => {`);
    if (isPrisma) {
      lines.push(`      const existing = await prisma.${lower}.findUnique({ where: { id: input.id } });`);
      lines.push(`      if (!existing) {`);
      lines.push(`        throw new TRPCError({ code: "NOT_FOUND", message: "${name} not found" });`);
      lines.push(`      }`);
      lines.push(`      await prisma.${lower}.delete({ where: { id: input.id } });`);
      lines.push(`      return { success: true as const };`);
    } else {
      lines.push(`      const [deleted] = await db.delete(${lower}Table)`);
      lines.push(`        .where(eq(${lower}Table.id, input.id)).returning();`);
      lines.push(`      if (!deleted) {`);
      lines.push(`        throw new TRPCError({ code: "NOT_FOUND", message: "${name} not found" });`);
      lines.push(`      }`);
      lines.push(`      return { success: true as const };`);
    }
    lines.push(`    }),`);
    lines.push("");

    // withRelations loader — only if this model has relation fields
    const relationFields = model.fields.filter(
      (f) => f.type === "relation" && f.relation
    );
    if (relationFields.length > 0) {
      if (includeComments) {
        lines.push(`  /** Get a ${name} with all relations loaded (batched) */`);
      }
      lines.push(`  getWithRelations: publicProcedure`);
      lines.push(`    .input(z.object({ id: z.string().uuid() }))`);
      lines.push(`    .query(async ({ input }) => {`);
      if (isPrisma) {
        lines.push(`      const ${lower} = await prisma.${lower}.findUnique({`);
        lines.push(`        where: { id: input.id },`);
        lines.push(`        include: {`);
        for (const f of relationFields) {
          lines.push(`          ${f.name}: true,`);
        }
        lines.push(`        },`);
        lines.push(`      });`);
      } else {
        lines.push(`      // Load base record then batch-load relations`);
        lines.push(`      const [${lower}] = await db.select().from(${lower}Table)`);
        lines.push(`        .where(eq(${lower}Table.id, input.id)).limit(1);`);
        for (const f of relationFields) {
          const relModel = f.relation!.model;
          lines.push(`      const ${f.name}Map = await load${relModel}sFor${name}([input.id]);`);
        }
      }
      lines.push(`      if (!${lower}) {`);
      lines.push(`        throw new TRPCError({ code: "NOT_FOUND", message: "${name} not found" });`);
      lines.push(`      }`);
      if (!isPrisma) {
        lines.push(`      return {`);
        lines.push(`        ...${lower},`);
        for (const f of relationFields) {
          lines.push(`        ${f.name}: ${f.name}Map.get(input.id) ?? [],`);
        }
        lines.push(`      };`);
      } else {
        lines.push(`      return ${lower};`);
      }
      lines.push(`    }),`);
      lines.push("");
    }

    lines.push(`});`);
    lines.push("");
  }

  // ── Merged appRouter ───────────────────────────────────────────────────────
  if (includeComments) {
    lines.push(`// ─── App router ───────────────────────────────────────────────────────────`);
    lines.push(`// Merge all model routers into a single appRouter.`);
    lines.push(`// Use this as the root router in your tRPC server setup.`);
    lines.push("");
  }
  lines.push(`export const appRouter = router({`);
  for (const model of schema.models) {
    lines.push(`  ${lowerFirst(model.name)}: ${lowerFirst(model.name)}Router,`);
  }
  lines.push(`});`);
  lines.push("");
  lines.push(`export type AppRouter = typeof appRouter;`);

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Build a map of model → [related model names that have a list relation back to it].
 * Used to generate dataloader functions only where needed.
 */
function buildRelationMap(schema: DatabaseSchema): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const model of schema.models) {
    for (const field of model.fields) {
      if (field.type === "relation" && field.isList && field.relation) {
        const parentModel = field.relation.model;
        const existing = map.get(parentModel) ?? [];
        if (!existing.includes(model.name)) {
          existing.push(model.name);
        }
        map.set(parentModel, existing);
      }
    }
  }

  return map;
}
