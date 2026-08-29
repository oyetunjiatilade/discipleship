import { z } from 'zod';
import { STAGE_VALUES } from '../../shared/constants/stages';

/** :convertId path param */
export const convertIdParamSchema = {
  params: z.object({
    convertId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid convert ID'),
  }),
};

/** POST body for a manual stage transition */
export const transitionStageSchema = {
  params: z.object({
    convertId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid convert ID'),
  }),
  body: z.object({
    targetStage: z.enum(STAGE_VALUES as [string, ...string[]]),
    reason: z.string().trim().max(500).optional(),
  }),
};

/** POST body for the Holy Spirit flag */
export const holySpiritSchema = {
  params: z.object({
    convertId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid convert ID'),
  }),
  body: z.object({
    filled: z.boolean(),
  }),
};
