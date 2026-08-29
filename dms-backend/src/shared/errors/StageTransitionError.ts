import { AppError } from './AppError';

export class StageTransitionError extends AppError {
  constructor(fromStage: string, toStage: string, reason?: string) {
    const message = reason
      ? `Cannot transition from ${fromStage} to ${toStage}: ${reason}`
      : `Invalid stage transition from ${fromStage} to ${toStage}`;

    super(message, 409, 'INVALID_STAGE_TRANSITION', true, { fromStage, toStage });
  }
}
