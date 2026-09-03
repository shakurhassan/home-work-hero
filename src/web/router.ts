export type Route =
  | { name: 'identity' }
  | { name: 'chooseIdentity' }
  | { name: 'register' }
  | { name: 'home' }
  | { name: 'newSubmission' }
  | { name: 'createSubmission' }
  | { name: 'addReviewer' }
  | { name: 'assign' }
  | { name: 'createAssignment' }
  | { name: 'submission'; id: string }
  | { name: 'addAttempt'; id: string }
  | { name: 'addReview'; id: string };

const FIXED: Record<string, Route> = {
  'GET /': { name: 'identity' },
  'POST /identity': { name: 'chooseIdentity' },
  'POST /register': { name: 'register' },
  'GET /home': { name: 'home' },
  'GET /new': { name: 'newSubmission' },
  'POST /submissions': { name: 'createSubmission' },
  'POST /reviewers': { name: 'addReviewer' },
  'GET /assign': { name: 'assign' },
  'POST /assignments': { name: 'createAssignment' },
};

const SUBMISSION = /^\/s\/([^/]+)$/;
const ATTEMPTS = /^\/s\/([^/]+)\/attempts$/;
const REVIEWS = /^\/s\/([^/]+)\/reviews$/;

export function matchRoute(method: string, path: string): Route | null {
  const fixed = FIXED[`${method} ${path}`];
  if (fixed !== undefined) return fixed;

  const submission = method === 'GET' ? SUBMISSION.exec(path) : null;
  if (submission?.[1] !== undefined) return { name: 'submission', id: submission[1] };

  const attempt = method === 'POST' ? ATTEMPTS.exec(path) : null;
  if (attempt?.[1] !== undefined) return { name: 'addAttempt', id: attempt[1] };

  const review = method === 'POST' ? REVIEWS.exec(path) : null;
  if (review?.[1] !== undefined) return { name: 'addReview', id: review[1] };

  return null;
}
