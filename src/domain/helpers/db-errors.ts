export function isExclusionViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return code === '23P01';
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (err === null || typeof err !== 'object') return false;
  const { code, constraint: pgConstraint, constraint_name } = err as {
    code?: unknown;
    constraint?: unknown;
    constraint_name?: unknown;
  };
  if (code !== '23505') return false;
  const name = pgConstraint ?? constraint_name;
  return constraint === undefined || name === constraint;
}