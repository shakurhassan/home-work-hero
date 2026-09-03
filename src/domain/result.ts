export type ErrorCode =
  | 'ALREADY_REVIEWED'
  | 'ANSWER_REQUIRED'
  | 'ALREADY_REVIEWER'
  | 'COMMENT_REQUIRED'
  | 'EMAIL_TAKEN'
  | 'INCONSISTENT_VERDICT'
  | 'INVALID_DECISION'
  | 'INVALID_NEXT_ACTION'
  | 'INVALID_EMAIL'
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'NOT_ASSIGNED_REVIEWER'
  | 'NO_ATTEMPT_TO_REVIEW'
  | 'NOT_A_REVIEWER'
  | 'NOT_THE_STUDENT'
  | 'PERSON_NOT_FOUND'
  | 'QUESTION_REQUIRED'
  | 'QUESTION_TOO_LONG'
  | 'REVIEW_PENDING'
  | 'SCORE_NOT_INTEGER'
  | 'SCORE_OUT_OF_RANGE'
  | 'SELF_REVIEW_FORBIDDEN'
  | 'SUBMISSION_CLOSED'
  | 'SUBMISSION_NOT_FOUND';

export interface Failure {
  code: ErrorCode;
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: Failure };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(code: ErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}
