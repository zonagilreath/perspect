import type { DatabaseSchema, Field, Model } from "@/types/schema";

/**
 * Parses a Prisma schema string into our intermediate DatabaseSchema representation.
 * This is fully deterministic — no LLM calls needed.
 */
export function parsePrismaSchema(input: string): DatabaseSchema {
  const models: Model[] = [];
  const enums: { name: string; values: string[] }[] = [];

  const lines = input.split("\n");
  let currentBlock: { type: "model" | "enum"; name: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Start of a model block
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentBlock = { type: "model", name: modelMatch[1], lines: [] };
      continue;
    }

    // Start of an enum block
    const enumMatch = trimmed.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      currentBlock = { type: "enum", name: enumMatch[1], lines: [] };
      continue;
    }

    // End of block
    if (trimmed === "}" && currentBlock) {
      if (currentBlock.type === "model") {
        models.push({
          name: currentBlock.name,
          fields: parseModelFields(currentBlock.lines, enums),
        });
      } else {
        enums.push({
          name: currentBlock.name,
          values: currentBlock.lines
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("//")),
        });
      }
      currentBlock = null;
      continue;
    }

    if (currentBlock && trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("@@")) {
      currentBlock.lines.push(trimmed);
    }
  }

  return { models, enums };
}

function parseModelFields(
  lines: string[],
  knownEnums: { name: string; values: string[] }[]
): Field[] {
  const fields: Field[] = [];

  for (const line of lines) {
    const field = parsePrismaField(line, knownEnums);
    if (field) fields.push(field);
  }

  return fields;
}

function parsePrismaField(
  line: string,
  knownEnums: { name: string; values: string[] }[]
): Field | null {
  // Match: fieldName Type? @attributes
  // Examples:
  //   id        String   @id @default(cuid())
  //   email     String   @unique
  //   name      String?
  //   posts     Post[]
  //   role      Role     @default(USER)
  //   createdAt DateTime @default(now())
  const match = line.match(/^(\w+)\s+(\w+)(\[\])?\??/);
  if (!match) return null;

  const [, name, rawType, isList] = match;
  const isOptional = line.includes("?");
  const isId = line.includes("@id");
  const isUnique = line.includes("@unique");

  // Parse default value
  let defaultValue: string | undefined;
  const defaultMatch = line.match(/@default\(([^)]+)\)/);
  if (defaultMatch) {
    defaultValue = defaultMatch[1];
  }

  // Determine field type
  const enumDef = knownEnums.find((e) => e.name === rawType);
  const type = mapPrismaType(rawType, !!enumDef);

  const field: Field = {
    name,
    type,
    isRequired: !isOptional,
    isUnique,
    isId,
    isList: !!isList,
  };

  if (defaultValue) field.default = defaultValue;

  if (enumDef) {
    field.enumValues = enumDef.values;
  }

  // Check for relation
  if (type === "relation") {
    const relationMatch = line.match(/@relation\(([^)]*)\)/);
    let foreignKey: string | undefined;
    if (relationMatch) {
      const fkMatch = relationMatch[1].match(/fields:\s*\[(\w+)\]/);
      if (fkMatch) foreignKey = fkMatch[1];
    }

    field.relation = {
      model: rawType,
      type: isList ? "one-to-many" : "one-to-one",
      foreignKey,
    };
  }

  return field;
}

function mapPrismaType(prismaType: string, isEnum: boolean): Field["type"] {
  if (isEnum) return "enum";

  const typeMap: Record<string, Field["type"]> = {
    String: "string",
    Int: "number",
    Float: "number",
    Decimal: "number",
    BigInt: "number",
    Boolean: "boolean",
    DateTime: "datetime",
    Json: "json",
  };

  return typeMap[prismaType] ?? "relation";
}
