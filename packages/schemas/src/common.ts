import { z } from "zod";

export const BaseEntitySchema = z.object({
	createdAt: z.coerce.date(),
	id: z.uuid(),
	updatedAt: z.coerce.date(),
});
