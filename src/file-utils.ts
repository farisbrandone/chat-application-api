import { z } from 'zod';

export const fileSchema = z.object({
  size: z.number(),
  buffer: z.instanceof(Buffer),
  originalName: z.string(),
  mimetype: z.string(),
});
