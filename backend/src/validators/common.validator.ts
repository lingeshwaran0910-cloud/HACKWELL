import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z
    .preprocess((val) => (val === undefined || val === '' ? 1 : Number(val)), z.number().int().min(1))
    .default(1),
  limit: z
    .preprocess((val) => (val === undefined || val === '' ? 20 : Number(val)), z.number().int().min(1).max(100))
    .default(20),
  sortBy: z.string().optional(),
  sortOrder: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase() : 'asc'),
      z.enum(['asc', 'desc'])
    )
    .default('asc'),
  q: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
