import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export type SchemaKind = "project-manifest" | "inventory" | "series-plan" | "timeline" | "approval-receipt" | "release-report";

async function validator(kind: SchemaKind) {
  const Ajv2020 = (Ajv2020Module as unknown as { default?: typeof Ajv2020Module }).default ?? Ajv2020Module;
  const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
  const ajv = new (Ajv2020 as unknown as new (options: Record<string, unknown>) => import("ajv").default)({ allErrors: true, strict: true });
  (addFormats as unknown as (instance: import("ajv").default) => void)(ajv);
  const schema = JSON.parse(await readFile(path.join(root, "schemas", `${kind}.schema.json`), "utf8"));
  const validate = ajv.compile(schema);
  return { ajv, validate };
}

export async function validateJsonValue(kind: SchemaKind, data: unknown): Promise<void> {
  const { ajv, validate } = await validator(kind);
  if (!validate(data)) throw new Error(`${kind} validation failed: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
}

export async function validateJsonFile(kind: SchemaKind, pathname: string): Promise<void> {
  await validateJsonValue(kind, JSON.parse(await readFile(pathname, "utf8")));
}
