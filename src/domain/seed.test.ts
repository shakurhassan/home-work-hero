import { describe, expect, it } from 'vitest';
import { seedState } from './seed.ts';

describe('seedState', () => {
  it('AC13: returns the documented four people and four submissions', () => {
    const state = seedState();

    expect(state.people).toEqual([
      { id: 'p1', name: 'Maya Chen', email: 'maya@example.com', isReviewer: false },
      { id: 'p2', name: 'Tomas Alvarez', email: 'tomas@example.com', isReviewer: false },
      { id: 'p3', name: 'Mr. Okafor', email: 'okafor@example.com', isReviewer: true },
      { id: 'p4', name: 'Sam Chen', email: 'sam@example.com', isReviewer: true },
    ]);
    expect(state.submissions.map((submission) => submission.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(Object.keys(state)).toEqual(['people', 'submissions']);
  });

  it('AC14: returns an independent copy each call', () => {
    const a = seedState();
    const b = seedState();

    a.people.push({ id: 'px', name: 'X', email: 'x@example.com', isReviewer: false });

    expect(b.people).toHaveLength(4);
  });
});
