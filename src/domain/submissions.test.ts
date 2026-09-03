import { describe, expect, it } from 'vitest';
import { isLocked } from './queries.ts';
import { seedState } from './seed.ts';
import type { AppState, Submission } from './types.ts';
import {
  addAttempt,
  assignSubmission,
  createSubmission,
  reviewAttempt,
  type ReviewAttemptInput,
} from './submissions.ts';
import { expectOk } from '../test-support.ts';

describe('createSubmission', () => {
  it('AC1: a student submits a question and an answer', () => {
    const state = expectOk(
      createSubmission(seedState(), {
        id: 's9',
        attemptId: 'a9',
        at: '2026-09-03T08:00:00.000Z',
        studentId: 'p1',
        reviewerId: 'p3',
        question: 'What is a prime number?',
        answer: 'A number with two factors.',
      }),
    );

    expect(state.submissions).toHaveLength(5);
    expect(state.submissions[4]).toEqual({
      id: 's9',
      studentId: 'p1',
      reviewerId: 'p3',
      question: 'What is a prime number?',
      status: 'AWAITING_REVIEW',
      createdBy: 'p1',
      createdAt: '2026-09-03T08:00:00.000Z',
      attempts: [
        {
          id: 'a9',
          answer: 'A number with two factors.',
          submittedAt: '2026-09-03T08:00:00.000Z',
          review: null,
        },
      ],
    });
  });

  it('AC11: rejects a blank question', () => {
    const state = seedState();

    const result = createSubmission(state, {
      id: 's9',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      studentId: 'p1',
      reviewerId: 'p3',
      question: '   ',
      answer: 'A number with two factors.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'QUESTION_REQUIRED', message: 'Question is required' },
    });
    expect(state.submissions).toHaveLength(4);
  });

  it('AC12: rejects a blank answer', () => {
    const result = createSubmission(seedState(), {
      id: 's9',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      studentId: 'p1',
      reviewerId: 'p3',
      question: 'What is a prime number?',
      answer: '   ',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'ANSWER_REQUIRED', message: 'Answer is required' },
    });
  });
});

describe('assignSubmission', () => {
  it('AC11: rejects an assignment with a blank question', () => {
    const state = seedState();

    const result = assignSubmission(state, {
      id: 's9',
      at: '2026-09-03T08:00:00.000Z',
      reviewerId: 'p3',
      studentId: 'p1',
      question: '   ',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'QUESTION_REQUIRED', message: 'Question is required' },
    });
    expect(state.submissions).toHaveLength(4);
  });

  it('AC13: rejects an assignment question of 2001 characters', () => {
    const result = assignSubmission(seedState(), {
      id: 's9',
      at: '2026-09-03T08:00:00.000Z',
      reviewerId: 'p3',
      studentId: 'p1',
      question: 'q'.repeat(2001),
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'QUESTION_TOO_LONG', message: 'Question must be 2000 characters or fewer' },
    });
  });

  it('AC28: rejects an assignment to someone not in the directory', () => {
    const state = seedState();

    const result = assignSubmission(state, {
      id: 's9',
      at: '2026-09-03T08:00:00.000Z',
      reviewerId: 'p3',
      studentId: 'p999',
      question: 'Ghost question.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'PERSON_NOT_FOUND', message: 'No person with id p999' },
    });
    expect(state.submissions).toHaveLength(4);
  });

  it('AC2: a reviewer assigns a question with no answer yet', () => {
    const state = expectOk(
      assignSubmission(seedState(), {
        id: 's9',
        at: '2026-09-03T08:00:00.000Z',
        reviewerId: 'p3',
        studentId: 'p1',
        question: 'List three prime numbers.',
      }),
    );

    expect(state.submissions).toHaveLength(5);
    const assigned = state.submissions[4];
    expect(assigned?.status).toBe('ASSIGNED');
    expect(assigned?.attempts).toHaveLength(0);
    expect(assigned?.createdBy).toBe('p3');
    expect(assigned?.reviewerId).toBe('p3');
  });
});

function submission(state: AppState, id: string): Submission {
  const found = state.submissions.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no submission ${id} in state`);
  return found;
}

describe('addAttempt', () => {
  it('AC3: answering an assigned question moves it into the review queue', () => {
    const state = expectOk(
      addAttempt(seedState(), {
        submissionId: 's4',
        attemptId: 'a9',
        at: '2026-09-03T08:00:00.000Z',
        actorId: 'p2',
        answer: 'Water evaporates, condenses, and falls as rain.',
      }),
    );

    const s4 = submission(state, 's4');
    expect(s4.status).toBe('AWAITING_REVIEW');
    expect(s4.attempts).toHaveLength(1);
    expect(s4.attempts[0]?.review).toBeNull();
  });

  it('AC12: rejects a blank answer on an assigned question', () => {
    const result = addAttempt(seedState(), {
      submissionId: 's4',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      actorId: 'p2',
      answer: '   ',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'ANSWER_REQUIRED', message: 'Answer is required' },
    });
  });

  it('AC27: refuses an answer from anyone but the student', () => {
    const state = seedState();

    const result = addAttempt(state, {
      submissionId: 's2',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      actorId: 'p3',
      answer: 'Not my homework.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'NOT_THE_STUDENT', message: 'Submission s2 belongs to Maya Chen' },
    });
    expect(submission(state, 's2').attempts).toHaveLength(1);
  });

  it('AC23: rejects an unknown submission id', () => {
    const result = addAttempt(seedState(), {
      submissionId: 's99',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      actorId: 'p1',
      answer: 'An answer to nothing.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'No submission with id s99' },
    });
  });

  it('AC10: refuses a second attempt while a review is pending', () => {
    const state = seedState();

    const result = addAttempt(state, {
      submissionId: 's1',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      actorId: 'p1',
      answer: 'Another go.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'REVIEW_PENDING', message: 'Submission s1 is already awaiting review' },
    });
    expect(submission(state, 's1').attempts).toHaveLength(1);
  });

  it('AC7: accepts a further attempt on a submission closed with CONTINUE', () => {
    const state = expectOk(
      addAttempt(seedState(), {
        submissionId: 's3',
        attemptId: 'a9',
        at: '2026-09-03T08:00:00.000Z',
        actorId: 'p2',
        answer: 'x = 5, checked by substitution.',
      }),
    );

    const s3 = submission(state, 's3');
    expect(s3.attempts).toHaveLength(3);
    expect(s3.status).toBe('AWAITING_REVIEW');
  });
});

describe('reviewAttempt', () => {
  it('AC4: a review with REPEAT reopens the submission for a new attempt', () => {
    const state = expectOk(
      reviewAttempt(seedState(), {
        submissionId: 's1',
        reviewId: 'r9',
        at: '2026-09-03T09:00:00.000Z',
        reviewerId: 'p3',
        decision: 'NOT_APPROVED',
        score: 40,
        nextAction: 'REPEAT',
        comment: 'Think about density.',
      }),
    );

    const s1 = submission(state, 's1');
    expect(s1.status).toBe('NEEDS_REVISION');
    expect(s1.attempts[0]?.review).toEqual({
      id: 'r9',
      reviewerId: 'p3',
      decision: 'NOT_APPROVED',
      score: 40,
      nextAction: 'REPEAT',
      comment: 'Think about density.',
      reviewedAt: '2026-09-03T09:00:00.000Z',
    });
  });

  const reviewOfS1 = (over: Partial<ReviewAttemptInput>): ReviewAttemptInput => ({
    submissionId: 's1',
    reviewId: 'r9',
    at: '2026-09-03T09:00:00.000Z',
    reviewerId: 'p3',
    decision: 'NOT_APPROVED',
    score: 40,
    nextAction: 'REPEAT',
    comment: 'Think about density.',
    ...over,
  });

  it('AC19: rejects a score of 101 and a score of -1', () => {
    const outOfRange = {
      ok: false,
      error: { code: 'SCORE_OUT_OF_RANGE', message: 'Score must be between 0 and 100' },
    };

    expect(
      reviewAttempt(seedState(), reviewOfS1({ score: 101, decision: 'APPROVED', nextAction: 'CONTINUE' })),
    ).toEqual(outOfRange);
    expect(reviewAttempt(seedState(), reviewOfS1({ score: -1 }))).toEqual(outOfRange);
  });

  it('AC19: accepts a score of 0 and a score of 100', () => {
    const zero = expectOk(reviewAttempt(seedState(), reviewOfS1({ score: 0 })));
    const hundred = expectOk(
      reviewAttempt(seedState(), reviewOfS1({ score: 100, decision: 'APPROVED', nextAction: 'CONTINUE' })),
    );

    expect(submission(zero, 's1').attempts[0]?.review?.score).toBe(0);
    expect(submission(hundred, 's1').attempts[0]?.review?.score).toBe(100);
  });

  it('AC26: does not mutate the state it is given', () => {
    const before = seedState();
    const snapshot = structuredClone(before);

    const after = expectOk(reviewAttempt(before, reviewOfS1({})));

    expect(before).toEqual(snapshot);
    expect(before.submissions[0]?.attempts[0]?.review).toBeNull();
    expect(after).not.toBe(before);
  });

  it('AC23: rejects an unknown submission id', () => {
    expect(reviewAttempt(seedState(), reviewOfS1({ submissionId: 's99' }))).toEqual({
      ok: false,
      error: { code: 'SUBMISSION_NOT_FOUND', message: 'No submission with id s99' },
    });
  });

  it('AC22: rejects a blank comment', () => {
    expect(reviewAttempt(seedState(), reviewOfS1({ comment: '   ' }))).toEqual({
      ok: false,
      error: { code: 'COMMENT_REQUIRED', message: 'Comment is required' },
    });
  });

  it('AC21: rejects APPROVED paired with REPEAT', () => {
    expect(
      reviewAttempt(seedState(), reviewOfS1({ decision: 'APPROVED', nextAction: 'REPEAT' })),
    ).toEqual({
      ok: false,
      error: {
        code: 'INCONSISTENT_VERDICT',
        message: 'APPROVED cannot be paired with REPEAT',
      },
    });
  });

  it('AC21: rejects NOT_APPROVED paired with DONE', () => {
    expect(
      reviewAttempt(seedState(), reviewOfS1({ decision: 'NOT_APPROVED', nextAction: 'DONE' })),
    ).toEqual({
      ok: false,
      error: {
        code: 'INCONSISTENT_VERDICT',
        message: 'NOT_APPROVED cannot be paired with DONE',
      },
    });
  });

  it('AC20: rejects a fractional score', () => {
    expect(reviewAttempt(seedState(), reviewOfS1({ score: 78.5 }))).toEqual({
      ok: false,
      error: { code: 'SCORE_NOT_INTEGER', message: 'Score must be a whole number' },
    });
  });

  it('AC18: refuses to review an attempt twice', () => {
    const state = seedState();

    const result = reviewAttempt(state, {
      submissionId: 's2',
      reviewId: 'r9',
      at: '2026-09-03T09:00:00.000Z',
      reviewerId: 'p3',
      decision: 'APPROVED',
      score: 90,
      nextAction: 'CONTINUE',
      comment: 'Second opinion.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'ALREADY_REVIEWED', message: 'Attempt a2 has already been reviewed' },
    });
    expect(submission(state, 's2').attempts[0]?.review?.score).toBe(52);
  });

  it('AC17: refuses a submission with no answer yet', () => {
    const result = reviewAttempt(seedState(), {
      submissionId: 's4',
      reviewId: 'r9',
      at: '2026-09-03T09:00:00.000Z',
      reviewerId: 'p3',
      decision: 'NOT_APPROVED',
      score: 40,
      nextAction: 'REPEAT',
      comment: 'Nothing to read yet.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'NO_ATTEMPT_TO_REVIEW', message: 'Submission s4 has no answer yet' },
    });
  });

  it('AC16: refuses a reviewer the submission is not assigned to', () => {
    const result = reviewAttempt(seedState(), {
      submissionId: 's1',
      reviewId: 'r9',
      at: '2026-09-03T09:00:00.000Z',
      reviewerId: 'p4',
      decision: 'NOT_APPROVED',
      score: 40,
      nextAction: 'REPEAT',
      comment: 'Think about density.',
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'NOT_ASSIGNED_REVIEWER',
        message: 'Submission s1 is assigned to Mr. Okafor',
      },
    });
  });

  it('AC5: a review with CONTINUE closes the submission without locking it', () => {
    const state = expectOk(
      reviewAttempt(seedState(), {
        submissionId: 's1',
        reviewId: 'r9',
        at: '2026-09-03T09:00:00.000Z',
        reviewerId: 'p3',
        decision: 'APPROVED',
        score: 88,
        nextAction: 'CONTINUE',
        comment: 'Good — density, not weight.',
      }),
    );

    const s1 = submission(state, 's1');
    expect(s1.status).toBe('CLOSED');
    expect(isLocked(s1)).toBe(false);
  });

  it('AC6: a review with DONE closes and locks the submission', () => {
    const state = expectOk(
      reviewAttempt(seedState(), {
        submissionId: 's1',
        reviewId: 'r9',
        at: '2026-09-03T09:00:00.000Z',
        reviewerId: 'p3',
        decision: 'APPROVED',
        score: 95,
        nextAction: 'DONE',
        comment: 'Finished.',
      }),
    );

    const s1 = submission(state, 's1');
    expect(s1.status).toBe('CLOSED');
    expect(isLocked(s1)).toBe(true);

    expect(
      addAttempt(state, {
        submissionId: 's1',
        attemptId: 'a9',
        at: '2026-09-03T10:00:00.000Z',
        actorId: 'p1',
        answer: 'One more go.',
      }),
    ).toEqual({
      ok: false,
      error: { code: 'SUBMISSION_CLOSED', message: 'Submission s1 is closed' },
    });
  });

  it('AC8: leaves earlier attempts and their reviews untouched', () => {
    const revised = expectOk(
      addAttempt(seedState(), {
        submissionId: 's2',
        attemptId: 'a9',
        at: '2026-09-03T08:00:00.000Z',
        actorId: 'p1',
        answer: 'Plants use sunlight, water and carbon dioxide to make glucose and oxygen.',
      }),
    );

    const state = expectOk(
      reviewAttempt(revised, {
        submissionId: 's2',
        reviewId: 'r9',
        at: '2026-09-03T09:00:00.000Z',
        reviewerId: 'p3',
        decision: 'APPROVED',
        score: 78,
        nextAction: 'CONTINUE',
        comment: 'Inputs and outputs are both there now.',
      }),
    );

    const s2 = submission(state, 's2');
    expect(s2.attempts).toHaveLength(2);
    expect(s2.attempts[0]?.id).toBe('a2');
    expect(s2.attempts[0]?.answer).toBe('Plants eat sunlight.');
    expect(s2.attempts[0]?.review?.score).toBe(52);
    expect(s2.attempts[0]?.review?.nextAction).toBe('REPEAT');
    expect(s2.attempts[1]?.review?.score).toBe(78);
  });
});

describe('createSubmission', () => {
  const longQuestion = (length: number) => ({
    id: 's9',
    attemptId: 'a9',
    at: '2026-09-03T08:00:00.000Z',
    studentId: 'p1',
    reviewerId: 'p3',
    question: 'q'.repeat(length),
    answer: 'A number with two factors.',
  });

  it('AC13: rejects a question of 2001 characters', () => {
    expect(createSubmission(seedState(), longQuestion(2001))).toEqual({
      ok: false,
      error: { code: 'QUESTION_TOO_LONG', message: 'Question must be 2000 characters or fewer' },
    });
  });

  it('AC13: accepts a question of 2000 characters', () => {
    const state = expectOk(createSubmission(seedState(), longQuestion(2000)));

    expect(state.submissions[4]?.question).toHaveLength(2000);
  });

  it('AC14: rejects a student sending work to themselves', () => {
    const result = createSubmission(seedState(), {
      id: 's9',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      studentId: 'p1',
      reviewerId: 'p1',
      question: 'What is a prime number?',
      answer: 'A number with two factors.',
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'SELF_REVIEW_FORBIDDEN',
        message: 'A person cannot review their own work',
      },
    });
  });

  it('AC15: rejects a reviewer who is not in the reviewer list', () => {
    const result = createSubmission(seedState(), {
      id: 's9',
      attemptId: 'a9',
      at: '2026-09-03T08:00:00.000Z',
      studentId: 'p1',
      reviewerId: 'p2',
      question: 'What is a prime number?',
      answer: 'A number with two factors.',
    });

    expect(result).toEqual({
      ok: false,
      error: { code: 'NOT_A_REVIEWER', message: 'Tomas Alvarez is not a reviewer' },
    });
  });

  it('AC14: rejects a reviewer assigning work to themselves', () => {
    const result = assignSubmission(seedState(), {
      id: 's9',
      at: '2026-09-03T08:00:00.000Z',
      reviewerId: 'p3',
      studentId: 'p3',
      question: 'List three prime numbers.',
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'SELF_REVIEW_FORBIDDEN',
        message: 'A person cannot review their own work',
      },
    });
  });
});
