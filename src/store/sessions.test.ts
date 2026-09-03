import { beforeEach, describe, expect, it } from 'vitest';
import { actorFor, clearSessions, setActor } from './sessions.ts';

describe('sessions', () => {
  beforeEach(() => {
    clearSessions();
  });

  it('AC4: remembers the actor for a session', () => {
    setActor('sess-1', 'p3');

    expect(actorFor('sess-1')).toBe('p3');
  });

  it('AC4: an unknown session has no actor', () => {
    expect(actorFor('sess-unknown')).toBeNull();
  });

  it('AC4: a null session has no actor', () => {
    expect(actorFor(null)).toBeNull();
  });
});
