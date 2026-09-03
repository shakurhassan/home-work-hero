import { seedState } from '../domain/seed.ts';
import type { AppState } from '../domain/types.ts';

let state: AppState | null = null;

// Seeded on first read, never at boot: the seed runs only when no previous
// data is available (PRD decision 8).
export function getState(): AppState {
  if (state === null) state = seedState();
  return state;
}

export function setState(next: AppState): void {
  state = next;
}

// Test support: forget everything, so the next read seeds again.
export function resetStore(): void {
  state = null;
}
