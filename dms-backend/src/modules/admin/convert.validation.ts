import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

/** PATCH /v1/admin/converts/:convertId/branch */
export const changeBranchSchema = {
  params: z.object({ convertId: objectId }),
  body: z.object({ branchId: objectId }),
};
