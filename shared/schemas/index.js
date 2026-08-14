/**
 * Shared validation schemas + helpers (`@shared/schemas` barrel).
 *
 * Plain ESM + Zod. The client imports this barrel via the `@shared/*` alias;
 * the server imports it via the linked workspace package
 * `@tile-visualizer/shared/schemas/index.js`.
 */

export { z } from "zod";
export { MONGO_ID_PATTERN, MongoObjectId } from "./id.schema.js";
export { ADMIN_ROLES, AdminSchema, AdminLoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from "./auth.schema.js";
export { ROOM_IDS, TEMPLATE_TYPES, CategoryTemplateSchema } from "./template.schema.js";
export { RoomSchema } from "./room.schema.js";
export {
  TileSchema,
  TilePropertiesSchema,
  TileTextureSchema,
  COMPATIBLE_ZONES,
} from "./tile.schema.js";
export { ProjectSchema, AppliedTilesSchema } from "./project.schema.js";

/**
 * Validate `data` against a Zod schema, returning a normalized result.
 * @param {import("zod").ZodType} schema
 * @param {unknown} data
 * @returns {{ ok: true, data: unknown, errors: string[] } | { ok: false, errors: string[] }}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, errors: [] };
  return {
    ok: false,
    errors: result.error.issues.map(
      (issue) =>
        `${issue.path.length ? issue.path.join(".") : "(root)"}: ${issue.message}`
    ),
  };
}

/**
 * Inferred document types (JSDoc — the repo is plain JS, no .ts files).
 * @typedef {import("zod").infer<typeof AdminSchema>} Admin
 * @typedef {import("zod").infer<typeof TileSchema>} Tile
 * @typedef {import("zod").infer<typeof CategoryTemplateSchema>} CategoryTemplate
 * @typedef {import("zod").infer<typeof ProjectSchema>} Project
 */
