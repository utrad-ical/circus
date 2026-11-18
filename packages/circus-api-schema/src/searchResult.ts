import { z } from 'zod';

export const searchResultOf = <Schema extends z.ZodType>(item: Schema) =>
  z.looseObject({
    items: z.array(item),
    totalItems: z.number(),
    page: z.number()
  });

export type SearchResponse<Item> = z.input<
  ReturnType<typeof searchResultOf<z.ZodType<unknown, Item>>>
>;
