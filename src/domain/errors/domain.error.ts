export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
  readonly code: string = 'DOMAIN_ERROR';

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}