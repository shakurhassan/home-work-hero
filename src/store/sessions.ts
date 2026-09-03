import type { PersonId } from '../domain/types.ts';

const actors = new Map<string, PersonId>();

export function newSessionId(): string {
  return crypto.randomUUID();
}

// Identity is per browser, deliberately outside AppState (PRD decision 11).
export function actorFor(sessionId: string | null): PersonId | null {
  if (sessionId === null) return null;
  return actors.get(sessionId) ?? null;
}

export function setActor(sessionId: string, personId: PersonId): void {
  actors.set(sessionId, personId);
}

// Test support.
export function clearSessions(): void {
  actors.clear();
}
