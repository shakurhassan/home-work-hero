import type { Result } from './domain/result.ts';

// Narrows a Result to its value, failing the test with the domain's own
// error code when the command did not succeed.
export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}: ${result.error.message}`);
  return result.value;
}
