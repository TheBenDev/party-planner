import { z } from 'zod';

export const BaseEntitySchema = z.object({
  createdAt: z.date(),
  id: z.uuid(),
  updatedAt: z.date(),
});
