import { err, ok, type Result } from './result.ts';
import type { Decision, NextAction } from './types.ts';

const MAX_NAME_LENGTH = 80;
const MAX_QUESTION_LENGTH = 2000;
const MIN_SCORE = 0;
const MAX_SCORE = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function requireName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed.length === 0) return err('NAME_REQUIRED', 'Name is required');
  if (trimmed.length > MAX_NAME_LENGTH) {
    return err('NAME_TOO_LONG', `Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  }
  return ok(trimmed);
}

export function requireQuestion(question: string): Result<string> {
  const trimmed = question.trim();
  if (trimmed.length === 0) return err('QUESTION_REQUIRED', 'Question is required');
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return err('QUESTION_TOO_LONG', `Question must be ${MAX_QUESTION_LENGTH} characters or fewer`);
  }
  return ok(trimmed);
}

const DECISIONS: readonly Decision[] = ['APPROVED', 'NOT_APPROVED'];
const NEXT_ACTIONS: readonly NextAction[] = ['CONTINUE', 'REPEAT', 'CORRECT', 'DONE'];

// Untrusted strings arrive from form posts; they reach the domain parsed or
// not at all.
export function requireDecision(value: string): Result<Decision> {
  const decision = DECISIONS.find((candidate) => candidate === value);
  if (decision === undefined) return err('INVALID_DECISION', `${value} is not a valid decision`);
  return ok(decision);
}

export function requireNextAction(value: string): Result<NextAction> {
  const action = NEXT_ACTIONS.find((candidate) => candidate === value);
  if (action === undefined) {
    return err('INVALID_NEXT_ACTION', `${value} is not a valid next action`);
  }
  return ok(action);
}

export function requireComment(comment: string): Result<string> {
  const trimmed = comment.trim();
  if (trimmed.length === 0) return err('COMMENT_REQUIRED', 'Comment is required');
  return ok(trimmed);
}

export function requireScore(score: number): Result<number> {
  if (!Number.isInteger(score)) {
    return err('SCORE_NOT_INTEGER', 'Score must be a whole number');
  }
  if (score < MIN_SCORE || score > MAX_SCORE) {
    return err('SCORE_OUT_OF_RANGE', `Score must be between ${MIN_SCORE} and ${MAX_SCORE}`);
  }
  return ok(score);
}

export function requireAnswer(answer: string): Result<string> {
  const trimmed = answer.trim();
  if (trimmed.length === 0) return err('ANSWER_REQUIRED', 'Answer is required');
  return ok(trimmed);
}

export function requireEmail(email: string): Result<string> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    return err('INVALID_EMAIL', `${normalized} is not a valid email address`);
  }
  return ok(normalized);
}
