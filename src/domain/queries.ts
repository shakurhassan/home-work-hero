import type { AppState, PersonId, Submission } from './types.ts';

// What is waiting on a reviewer, oldest answer first.
export function queueForReviewer(state: AppState, reviewerId: PersonId): Submission[] {
  return state.submissions
    .filter(
      (submission) =>
        submission.reviewerId === reviewerId && submission.status === 'AWAITING_REVIEW',
    )
    .sort((a, b) => (a.attempts.at(-1)?.submittedAt ?? '').localeCompare(b.attempts.at(-1)?.submittedAt ?? ''));
}

// What is waiting on a student: work assigned to them, and work sent back
// for another attempt.
export function assignmentsFor(state: AppState, studentId: PersonId): Submission[] {
  return state.submissions.filter(
    (submission) =>
      submission.studentId === studentId &&
      (submission.status === 'ASSIGNED' || submission.status === 'NEEDS_REVISION'),
  );
}

// CORRECT means "fix what you wrote", so the next attempt starts from the
// previous answer. REPEAT means "do it again", and starts blank.
export function draftAnswerFor(state: AppState, submissionId: string): string {
  const submission = state.submissions.find((candidate) => candidate.id === submissionId);
  const last = submission?.attempts.at(-1);
  return last?.review?.nextAction === 'CORRECT' ? last.answer : '';
}

// A submission is locked only when its last review said DONE. CONTINUE also
// closes it, but leaves the student free to add a further attempt.
export function isLocked(submission: Submission): boolean {
  return submission.attempts.at(-1)?.review?.nextAction === 'DONE';
}
