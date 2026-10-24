export class ApiError extends Error {
  constructor(message, status = 500, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.assign(this, details);
  }
}

