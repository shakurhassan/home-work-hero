import { beforeEach, describe, expect, it } from 'vitest';
import { getState, resetStore, setState } from './store.ts';

describe('store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('AC1: seeds itself on first read', () => {
    const state = getState();

    expect(state.people.map((person) => person.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(state.submissions.map((submission) => submission.id)).toEqual([
      's1',
      's2',
      's3',
      's4',
    ]);
  });

  it('AC2: does not reseed when data already exists', () => {
    setState({ people: [], submissions: [] });

    expect(getState().people).toHaveLength(0);
  });
});
