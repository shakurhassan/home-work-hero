import type { IncomingMessage, ServerResponse } from 'node:http';
import { addReviewer, registerStudent, selectActor } from '../domain/people.ts';
import type { Result } from '../domain/result.ts';
import {
  addAttempt,
  assignSubmission,
  createSubmission,
  reviewAttempt,
} from '../domain/submissions.ts';
import type { AppState, PersonId } from '../domain/types.ts';
import { actorFor, newSessionId, setActor } from '../store/sessions.ts';
import { getState, setState } from '../store/store.ts';
import { readCookie, SESSION_COOKIE } from './cookies.ts';
import { parseForm } from './form.ts';
import { requireDecision, requireNextAction } from '../domain/validation.ts';
import { matchRoute, type Route } from './router.ts';
import {
  assignPage,
  homePage,
  identityPage,
  newSubmissionPage,
  submissionPage,
} from './views.ts';

// The edge — and the only place ids and timestamps are minted, so every
// domain function stays pure and every test can assert an exact value.
function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function html(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  response.end(body);
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(303, { location });
  response.end();
}

async function readBody(request: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return parseForm(Buffer.concat(chunks).toString('utf8'));
}

// Commit on success, hand the domain's own message back on failure.
function commit(result: Result<AppState>, onOk: () => void, onError: (message: string) => void): void {
  if (result.ok) {
    setState(result.value);
    onOk();
    return;
  }
  onError(result.error.message);
}

export async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const route = matchRoute(request.method ?? 'GET', (request.url ?? '/').split('?')[0] ?? '/');
  if (route === null) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
    return;
  }

  let sessionId = readCookie(request.headers.cookie, SESSION_COOKIE);
  if (sessionId === null) {
    sessionId = newSessionId();
    response.setHeader('set-cookie', `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
  }

  const actorId = actorFor(sessionId);
  const state = getState();

  // Everything but the identity picker needs to know who you are.
  if (actorId === null && route.name !== 'identity' && route.name !== 'chooseIdentity' && route.name !== 'register') {
    redirect(response, '/');
    return;
  }

  await route_(route, request, response, state, sessionId, actorId);
}

async function route_(
  route: Route,
  request: IncomingMessage,
  response: ServerResponse,
  state: AppState,
  sessionId: string,
  actorId: PersonId | null,
): Promise<void> {
  switch (route.name) {
    case 'identity':
      html(response, 200, identityPage(state));
      return;

    case 'chooseIdentity': {
      const form = await readBody(request);
      const chosen = selectActor(state, form['personId'] ?? '');
      if (!chosen.ok) {
        html(response, 200, identityPage(state, chosen.error.message));
        return;
      }
      setActor(sessionId, chosen.value);
      redirect(response, '/home');
      return;
    }

    case 'register': {
      const form = await readBody(request);
      const id = newId('p');
      const result = registerStudent(state, {
        id,
        name: form['name'] ?? '',
        email: form['email'] ?? '',
      });
      commit(
        result,
        () => {
          setActor(sessionId, id);
          redirect(response, '/home');
        },
        (message) => html(response, 200, identityPage(state, message)),
      );
      return;
    }

    case 'home':
      html(response, 200, homePage(state, actorId ?? ''));
      return;

    case 'newSubmission':
      html(response, 200, newSubmissionPage(state, actorId ?? ''));
      return;

    case 'createSubmission': {
      const form = await readBody(request);
      const id = newId('s');
      const result = createSubmission(state, {
        id,
        attemptId: newId('a'),
        at: now(),
        studentId: actorId ?? '',
        reviewerId: form['reviewerId'] ?? '',
        question: form['question'] ?? '',
        answer: form['answer'] ?? '',
      });
      commit(
        result,
        () => redirect(response, `/s/${id}`),
        (message) =>
          html(response, 200, newSubmissionPage(state, actorId ?? '', message, form)),
      );
      return;
    }

    case 'addReviewer': {
      const form = await readBody(request);
      const result = addReviewer(state, {
        id: newId('p'),
        name: form['name'] ?? '',
        email: form['email'] ?? '',
      });
      commit(
        result,
        () => redirect(response, '/new'),
        (message) =>
          html(response, 200, newSubmissionPage(state, actorId ?? '', message, form)),
      );
      return;
    }

    case 'assign':
      html(response, 200, assignPage(state, actorId ?? ''));
      return;

    case 'createAssignment': {
      const form = await readBody(request);
      const id = newId('s');
      const result = assignSubmission(state, {
        id,
        at: now(),
        reviewerId: actorId ?? '',
        studentId: form['studentId'] ?? '',
        question: form['question'] ?? '',
      });
      commit(
        result,
        () => redirect(response, `/s/${id}`),
        (message) => html(response, 200, assignPage(state, actorId ?? '', message, form)),
      );
      return;
    }

    case 'submission': {
      const exists = state.submissions.some((submission) => submission.id === route.id);
      html(response, exists ? 200 : 404, submissionPage(state, actorId ?? '', route.id));
      return;
    }

    case 'addAttempt': {
      const form = await readBody(request);
      const result = addAttempt(state, {
        submissionId: route.id,
        attemptId: newId('a'),
        at: now(),
        actorId: actorId ?? '',
        answer: form['answer'] ?? '',
      });
      commit(
        result,
        () => redirect(response, `/s/${route.id}`),
        (message) => html(response, 200, submissionPage(state, actorId ?? '', route.id, message, form)),
      );
      return;
    }

    case 'addReview': {
      const form = await readBody(request);
      const fail = (message: string): void => {
        html(response, 200, submissionPage(state, actorId ?? '', route.id, message, form));
      };

      const decision = requireDecision(form['decision'] ?? '');
      if (!decision.ok) {
        fail(decision.error.message);
        return;
      }

      const nextAction = requireNextAction(form['nextAction'] ?? '');
      if (!nextAction.ok) {
        fail(nextAction.error.message);
        return;
      }

      const result = reviewAttempt(state, {
        submissionId: route.id,
        reviewId: newId('r'),
        at: now(),
        reviewerId: actorId ?? '',
        decision: decision.value,
        score: Number(form['score'] ?? Number.NaN),
        nextAction: nextAction.value,
        comment: form['comment'] ?? '',
      });
      commit(result, () => redirect(response, `/s/${route.id}`), fail);
      return;
    }
  }
}
