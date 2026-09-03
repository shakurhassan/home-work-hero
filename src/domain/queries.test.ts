import { describe, expect, it } from 'vitest';
import { assignmentsFor, draftAnswerFor, queueForReviewer } from './queries.ts';
import { seedState } from './seed.ts';
import type { AppState } from './types.ts';

// s3 as it stood before its second attempt: one attempt, reviewed CORRECT.
function beforeSecondAttempt(): AppState {
  const state = seedState();
  return {
    ...state,
    submissions: state.submissions.map((submission) =>
      submission.id === 's3'
        ? { ...submission, status: 'NEEDS_REVISION' as const, attempts: submission.attempts.slice(0, 1) }
        : submission,
    ),
  };
}

describe('queueForReviewer', () => {
  it("AC24: returns only that reviewer's pending submissions", () => {
    const queue = queueForReviewer(seedState(), 'p3');

    expect(queue.map((submission) => submission.id)).toEqual(['s1']);
  });

  it('AC24: returns an empty queue when everything is closed', () => {
    expect(queueForReviewer(seedState(), 'p4')).toEqual([]);
  });
});

describe('assignmentsFor', () => {
  it('AC25: returns work assigned to the student', () => {
    const assignments = assignmentsFor(seedState(), 'p2');

    expect(assignments.map((submission) => submission.id)).toEqual(['s4']);
  });

  it('AC25: returns work needing revision', () => {
    const assignments = assignmentsFor(seedState(), 'p1');

    expect(assignments.map((submission) => submission.id)).toEqual(['s2']);
  });
});

describe('draftAnswerFor', () => {
  it('AC9: returns a blank draft after REPEAT', () => {
    expect(draftAnswerFor(seedState(), 's2')).toBe('');
  });

  it('AC9: returns the previous answer after CORRECT', () => {
    expect(draftAnswerFor(beforeSecondAttempt(), 's3')).toBe('x = 5');
  });
});
