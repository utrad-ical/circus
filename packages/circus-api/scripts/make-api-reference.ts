// Writes the routes of the API and their schemas to `api-reference.json`,
// which circus-docs reads to build the API reference.
//
//   pnpm -F @utrad-ical/circus-api run api-reference

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { RouteDefinition, RouteGroup } from '../src/defineRoute.ts';
import glob from '../src/utils/glob.ts';

const root = path.join(import.meta.dirname, '..');
const apiDir = path.join(root, 'src/api');
const outFile = path.join(root, 'api-reference.json');

// The JSON format (dates are strings); types that JSON Schema cannot
// express (such as custom checks) become `{}`
const toJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

const toEntry = (route: RouteDefinition) => {
  const { handler, request, response, ...rest } = route;
  return {
    ...rest,
    ...(request ? { request: toJsonSchema(request) } : {}),
    ...(response ? { response: toJsonSchema(response) } : {})
  };
};

const files = (await glob(path.join(apiDir, '**/routes.ts'))).sort();
const categories = [];
for (const file of files) {
  const group = ((await import(file)) as { default: RouteGroup }).default;
  categories.push({
    category: path.relative(apiDir, path.dirname(file)),
    name: group.name,
    description: group.description,
    routes: group.routes.map(toEntry)
  });
}

await fs.writeFile(outFile, JSON.stringify(categories, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);
