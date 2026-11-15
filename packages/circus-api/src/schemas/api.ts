import { z } from 'zod';

const stringOrStrings = z.union([z.string(), z.array(z.string())]);

/**
 * The format of API manifest files (`api/*\/index.yaml`).
 */
export const api = z.strictObject({
  name: z.string().optional(),
  description: z.string().optional(),
  routes: z.array(
    z.strictObject({
      verb: z.enum(['get', 'put', 'post', 'patch', 'delete']),
      path: z.string(),
      handler: z
        .string()
        .optional()
        .describe('Handler name. Defaults to one based on the verb.'),
      description: z.string().optional(),
      requiredGlobalPrivilege: stringOrStrings.optional(),
      requiredProjectPrivilege: stringOrStrings.optional(),
      requiredPluginPrivilege: stringOrStrings.optional(),
      requiredSeriesDomainCheck: z.union([z.string(), z.boolean()]).optional(),
      forDebug: z
        .boolean()
        .optional()
        .describe('Loaded only when the server runs in the debug mode.'),
      expectedContentType: z.string().optional(),
      requestSchema: z
        .string()
        .optional()
        .describe('Schema name of the request body.'),
      responseSchema: z
        .string()
        .optional()
        .describe('Schema name of the response body.'),
      noAuthentication: z.literal(true).optional()
    })
  )
});
