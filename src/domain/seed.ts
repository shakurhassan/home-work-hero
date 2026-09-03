import type { AppState } from './types.ts';

// The fixture documented in specs/features/identity-and-directory.md and
// specs/features/review-loop.md. Four people, and four submissions parked
// in four different statuses so the demo shows the whole loop at a glance.
export function seedState(): AppState {
  return {
    people: [
      { id: 'p1', name: 'Maya Chen', email: 'maya@example.com', isReviewer: false },
      { id: 'p2', name: 'Tomas Alvarez', email: 'tomas@example.com', isReviewer: false },
      { id: 'p3', name: 'Mr. Okafor', email: 'okafor@example.com', isReviewer: true },
      { id: 'p4', name: 'Sam Chen', email: 'sam@example.com', isReviewer: true },
    ],
    submissions: [
      {
        id: 's1',
        studentId: 'p1',
        reviewerId: 'p3',
        question: 'Why does ice float on water?',
        status: 'AWAITING_REVIEW',
        createdBy: 'p1',
        createdAt: '2026-09-01T09:00:00.000Z',
        attempts: [
          {
            id: 'a1',
            answer: 'Because it is lighter.',
            submittedAt: '2026-09-01T09:00:00.000Z',
            review: null,
          },
        ],
      },
      {
        id: 's2',
        studentId: 'p1',
        reviewerId: 'p3',
        question: 'Explain photosynthesis in your own words.',
        status: 'NEEDS_REVISION',
        createdBy: 'p1',
        createdAt: '2026-09-01T10:00:00.000Z',
        attempts: [
          {
            id: 'a2',
            answer: 'Plants eat sunlight.',
            submittedAt: '2026-09-01T10:00:00.000Z',
            review: {
              id: 'r1',
              reviewerId: 'p3',
              decision: 'NOT_APPROVED',
              score: 52,
              nextAction: 'REPEAT',
              comment: 'Name the inputs and the outputs.',
              reviewedAt: '2026-09-01T12:00:00.000Z',
            },
          },
        ],
      },
      {
        id: 's3',
        studentId: 'p2',
        reviewerId: 'p4',
        question: 'Solve 3x + 7 = 22 and show your working.',
        status: 'CLOSED',
        createdBy: 'p2',
        createdAt: '2026-08-30T16:00:00.000Z',
        attempts: [
          {
            id: 'a3',
            answer: 'x = 5',
            submittedAt: '2026-08-30T16:00:00.000Z',
            review: {
              id: 'r2',
              reviewerId: 'p4',
              decision: 'NOT_APPROVED',
              score: 52,
              nextAction: 'CORRECT',
              comment: 'Right answer, but show every step.',
              reviewedAt: '2026-08-30T18:00:00.000Z',
            },
          },
          {
            id: 'a4',
            answer: '3x + 7 = 22 → 3x = 15 → x = 5',
            submittedAt: '2026-08-31T08:00:00.000Z',
            review: {
              id: 'r3',
              reviewerId: 'p4',
              decision: 'APPROVED',
              score: 78,
              nextAction: 'CONTINUE',
              comment: 'Working is clear now.',
              reviewedAt: '2026-08-31T09:00:00.000Z',
            },
          },
        ],
      },
      {
        id: 's4',
        studentId: 'p2',
        reviewerId: 'p3',
        question: 'Write three sentences about the water cycle.',
        status: 'ASSIGNED',
        createdBy: 'p3',
        createdAt: '2026-09-02T11:00:00.000Z',
        attempts: [],
      },
    ],
  };
}
