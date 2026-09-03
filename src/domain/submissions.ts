import { err, ok, type Result } from './result.ts';
import { isLocked } from './queries.ts';
import {
  requireAnswer,
  requireComment,
  requireQuestion,
  requireScore,
} from './validation.ts';
import type {
  AppState,
  Attempt,
  Decision,
  NextAction,
  PersonId,
  SubmissionStatus,
  Submission,
} from './types.ts';

export interface CreateSubmissionInput {
  id: string;
  attemptId: string;
  at: string;
  studentId: PersonId;
  reviewerId: PersonId;
  question: string;
  answer: string;
}

function withSubmission(state: AppState, submission: Submission): AppState {
  return { ...state, submissions: [...state.submissions, submission] };
}

function mapSubmission(
  state: AppState,
  id: string,
  change: (submission: Submission) => Submission,
): AppState {
  return {
    ...state,
    submissions: state.submissions.map((submission) =>
      submission.id === id ? change(submission) : submission,
    ),
  };
}

function requireDifferentPeople(
  studentId: PersonId,
  reviewerId: PersonId,
): Result<null> {
  if (studentId === reviewerId) {
    return err('SELF_REVIEW_FORBIDDEN', 'A person cannot review their own work');
  }
  return ok(null);
}

function findSubmission(state: AppState, id: string): Result<Submission> {
  const submission = state.submissions.find((candidate) => candidate.id === id);
  if (submission === undefined) {
    return err('SUBMISSION_NOT_FOUND', `No submission with id ${id}`);
  }
  return ok(submission);
}

function requireReviewer(state: AppState, reviewerId: PersonId): Result<null> {
  const person = state.people.find((candidate) => candidate.id === reviewerId);
  if (person === undefined || !person.isReviewer) {
    return err('NOT_A_REVIEWER', `${person?.name ?? reviewerId} is not a reviewer`);
  }
  return ok(null);
}

function newAttempt(id: string, answer: string, at: string): Attempt {
  return { id, answer, submittedAt: at, review: null };
}

// APPROVED means the work is accepted, so it can only pair with an action
// that closes. NOT_APPROVED can only pair with one that sends work back.
const ACTIONS_FOR: Record<Decision, readonly NextAction[]> = {
  APPROVED: ['CONTINUE', 'DONE'],
  NOT_APPROVED: ['REPEAT', 'CORRECT'],
};

function requireConsistentVerdict(decision: Decision, nextAction: NextAction): Result<null> {
  if (!ACTIONS_FOR[decision].includes(nextAction)) {
    return err('INCONSISTENT_VERDICT', `${decision} cannot be paired with ${nextAction}`);
  }
  return ok(null);
}

// The transition table from specs/features/review-loop.md.
const STATUS_AFTER: Record<NextAction, SubmissionStatus> = {
  CONTINUE: 'CLOSED',
  DONE: 'CLOSED',
  REPEAT: 'NEEDS_REVISION',
  CORRECT: 'NEEDS_REVISION',
};

export function createSubmission(state: AppState, input: CreateSubmissionInput): Result<AppState> {
  const question = requireQuestion(input.question);
  if (!question.ok) return question;

  const answer = requireAnswer(input.answer);
  if (!answer.ok) return answer;

  const distinct = requireDifferentPeople(input.studentId, input.reviewerId);
  if (!distinct.ok) return distinct;

  const reviewer = requireReviewer(state, input.reviewerId);
  if (!reviewer.ok) return reviewer;

  return ok(
    withSubmission(state, {
      id: input.id,
      studentId: input.studentId,
      reviewerId: input.reviewerId,
      question: question.value,
      status: 'AWAITING_REVIEW',
      createdBy: input.studentId,
      createdAt: input.at,
      attempts: [newAttempt(input.attemptId, answer.value, input.at)],
    }),
  );
}

export interface AssignSubmissionInput {
  id: string;
  at: string;
  reviewerId: PersonId;
  studentId: PersonId;
  question: string;
}

export function assignSubmission(state: AppState, input: AssignSubmissionInput): Result<AppState> {
  const question = requireQuestion(input.question);
  if (!question.ok) return question;

  const distinct = requireDifferentPeople(input.studentId, input.reviewerId);
  if (!distinct.ok) return distinct;

  if (!state.people.some((person) => person.id === input.studentId)) {
    return err('PERSON_NOT_FOUND', `No person with id ${input.studentId}`);
  }

  return ok(
    withSubmission(state, {
      id: input.id,
      studentId: input.studentId,
      reviewerId: input.reviewerId,
      question: question.value,
      status: 'ASSIGNED',
      createdBy: input.reviewerId,
      createdAt: input.at,
      attempts: [],
    }),
  );
}

export interface AddAttemptInput {
  submissionId: string;
  attemptId: string;
  at: string;
  actorId: PersonId;
  answer: string;
}

export function addAttempt(state: AppState, input: AddAttemptInput): Result<AppState> {
  const found = findSubmission(state, input.submissionId);
  if (!found.ok) return found;
  const existing = found.value;

  if (existing.studentId !== input.actorId) {
    const owner = state.people.find((person) => person.id === existing.studentId);
    return err(
      'NOT_THE_STUDENT',
      `Submission ${existing.id} belongs to ${owner?.name ?? existing.studentId}`,
    );
  }

  const answer = requireAnswer(input.answer);
  if (!answer.ok) return answer;

  if (isLocked(existing)) {
    return err('SUBMISSION_CLOSED', `Submission ${existing.id} is closed`);
  }
  if (existing.status === 'AWAITING_REVIEW') {
    return err('REVIEW_PENDING', `Submission ${existing.id} is already awaiting review`);
  }

  return ok(
    mapSubmission(state, input.submissionId, (submission) => ({
      ...submission,
      status: 'AWAITING_REVIEW',
      attempts: [...submission.attempts, newAttempt(input.attemptId, answer.value, input.at)],
    })),
  );
}

export interface ReviewAttemptInput {
  submissionId: string;
  reviewId: string;
  at: string;
  reviewerId: PersonId;
  decision: Decision;
  score: number;
  nextAction: NextAction;
  comment: string;
}

export function reviewAttempt(state: AppState, input: ReviewAttemptInput): Result<AppState> {
  const found = findSubmission(state, input.submissionId);
  if (!found.ok) return found;
  const existing = found.value;

  if (existing.reviewerId !== input.reviewerId) {
    const assignee = state.people.find((person) => person.id === existing.reviewerId);
    return err(
      'NOT_ASSIGNED_REVIEWER',
      `Submission ${existing.id} is assigned to ${assignee?.name ?? existing.reviewerId}`,
    );
  }
  if (existing.attempts.length === 0) {
    return err('NO_ATTEMPT_TO_REVIEW', `Submission ${existing.id} has no answer yet`);
  }

  const last = existing.attempts.at(-1);
  if (last !== undefined && last.review !== null) {
    return err('ALREADY_REVIEWED', `Attempt ${last.id} has already been reviewed`);
  }

  const score = requireScore(input.score);
  if (!score.ok) return score;

  const verdict = requireConsistentVerdict(input.decision, input.nextAction);
  if (!verdict.ok) return verdict;

  const comment = requireComment(input.comment);
  if (!comment.ok) return comment;

  return ok(
    mapSubmission(state, input.submissionId, (submission) => ({
      ...submission,
      status: STATUS_AFTER[input.nextAction],
      attempts: submission.attempts.map((attempt, index) =>
        index === submission.attempts.length - 1
          ? {
              ...attempt,
              review: {
                id: input.reviewId,
                reviewerId: input.reviewerId,
                decision: input.decision,
                score: input.score,
                nextAction: input.nextAction,
                comment: comment.value,
                reviewedAt: input.at,
              },
            }
          : attempt,
      ),
    })),
  );
}
