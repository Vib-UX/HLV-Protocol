export class HLVError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'HLVError';
  }
}

export class HTLCError extends HLVError {
  constructor(message: string, code = 'HTLC_ERROR') {
    super(message, code, 500);
    this.name = 'HTLCError';
  }
}

export class LightningError extends HLVError {
  constructor(message: string, code = 'LIGHTNING_ERROR') {
    super(message, code, 500);
    this.name = 'LightningError';
  }
}

export class ValidationError extends HLVError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HLVError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

