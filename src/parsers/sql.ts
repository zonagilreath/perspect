import type { DatabaseSchema, Field, Model } from "@/types/schema";

/**
 * Parses SQL DDL (CREATE TABLE statements) into our intermediate representation.
 * Handles PostgreSQL and MySQL-style DDL.
 */
export function parseSqlSchema(input: string): DatabaseSchema {
  const models: Model[] = [];
  const enums: { name: string; values: string[] }[] = [];

  // Extract CREATE TYPE ... AS ENUM (PostgreSQL)
  const enumRegex = /CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(input)) !== null) {
    const name = enumMatch[1];
    const values = enumMatch[2]
      .split(",")
      .map((v) => v.trim().replace(/'/g, ""));
    enums.push({ name, values });
  }

  // Extract CREATE TABLE blocks
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([^;]+)\)/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(input)) !== null) {
    const tableName = tableMatch[1];
    const body = tableMatch[2];
    const fields = parseSqlColumns(body, enums);

    models.push({
      name: toPascalCase(tableName),
      fields,
    });
  }

  return { models, enums };
}

function parseSqlColumns(
  body: string,
  knownEnums: { name: string; values: string[] }[]
): Field[] {
  const fields: Field[] = [];

  // Split by comma, but be careful of commas inside parentheses
  const columnDefs = splitColumns(body);

  for (const def of columnDefs) {
    const trimmed = def.trim();

    // Skip constraints like PRIMARY KEY, FOREIGN KEY, UNIQUE, INDEX, CHECK
    if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|CHECK|CONSTRAINT)/i.test(trimmed)) {
      continue;
    }

    const field = parseSqlColumn(trimmed, knownEnums);
    if (field) fields.push(field);
  }

  return fields;
}

function parseSqlColumn(
  def: string,
  knownEnums: { name: string; values: string[] }[]
): Field | null {
  // Match: column_name TYPE(size) [NOT NULL] [DEFAULT ...] [PRIMARY KEY] [UNIQUE] [REFERENCES ...]
  const match = def.match(/^["`]?(\w+)["`]?\s+(\w+)(?:\(([^)]*)\))?(.*)$/i);
  if (!match) return null;

  const [, name, rawType, typeParam, rest] = match;
  const upperType = rawType.toUpperCase();
  const restUpper = rest.toUpperCase();

  const isId = restUpper.includes("PRIMARY KEY") || restUpper.includes("SERIAL");
  const isUnique = restUpper.includes("UNIQUE");
  const isRequired = restUpper.includes("NOT NULL") || isId;

  let defaultValue: string | undefined;
  const defaultMatch = rest.match(/DEFAULT\s+(?:'([^']*)'|(\S+))/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1] ?? defaultMatch[2];
  }

  // Check for enum type
  const enumDef = knownEnums.find(
    (e) => e.name.toLowerCase() === rawType.toLowerCase()
  );

  // Check for REFERENCES (foreign key)
  const refMatch = rest.match(/REFERENCES\s+["`]?(\w+)["`]?/i);

  const type = enumDef ? "enum" : mapSqlType(upperType);

  const field: Field = {
    name: toCamelCase(name),
    type,
    isRequired,
    isUnique,
    isId,
    isList: false,
  };

  if (defaultValue) field.default = defaultValue;
  if (enumDef) field.enumValues = enumDef.values;

  if (refMatch) {
    field.type = "relation";
    field.relation = {
      model: toPascalCase(refMatch[1]),
      type: "one-to-one",
      foreignKey: toCamelCase(name),
    };
  }

  return field;
}

function mapSqlType(sqlType: string): Field["type"] {
  const typeMap: Record<string, Field["type"]> = {
    // String types
    VARCHAR: "string",
    CHAR: "string",
    TEXT: "string",
    UUID: "string",
    CITEXT: "string",
    // Number types
    INTEGER: "number",
    INT: "number",
    SMALLINT: "number",
    BIGINT: "number",
    SERIAL: "number",
    BIGSERIAL: "number",
    FLOAT: "number",
    DOUBLE: "number",
    DECIMAL: "number",
    NUMERIC: "number",
    REAL: "number",
    // Boolean
    BOOLEAN: "boolean",
    BOOL: "boolean",
    // Date/time
    DATE: "date",
    TIMESTAMP: "datetime",
    TIMESTAMPTZ: "datetime",
    // JSON
    JSON: "json",
    JSONB: "json",
  };

  return typeMap[sqlType] ?? "string";
}

// ─── String utilities ───────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function splitColumns(body: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of body) {
    if (char === "(") depth++;
    else if (char === ")") depth--;

    if (char === "," && depth === 0) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) result.push(current);
  return result;
}
